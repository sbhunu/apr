-- Quota Recalculation Trigger
-- Automatically recalculates quotas when section geometries change
-- All functions use apr schema prefix as required

-- ============================================================================
-- FUNCTION: Recalculate Quotas on Geometry Update
-- ============================================================================
CREATE OR REPLACE FUNCTION apr.recalculate_quotas_on_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_survey_plan_id UUID;
  v_total_unit_area NUMERIC;
  v_parent_area NUMERIC;
  v_common_area NUMERIC;
  v_new_quota NUMERIC;
  v_common_share NUMERIC;
BEGIN
  -- Get survey plan ID
  v_survey_plan_id := NEW.survey_plan_id;

  -- Only recalculate if computed_area changed
  IF OLD.computed_area IS NOT DISTINCT FROM NEW.computed_area THEN
    RETURN NEW;
  END IF;

  -- Skip if section type is 'common'
  IF NEW.section_type = 'common' THEN
    RETURN NEW;
  END IF;

  -- Get parent parcel area
  SELECT parent_parcel_area INTO v_parent_area
  FROM apr.survey_sectional_plans
  WHERE id = v_survey_plan_id;

  IF v_parent_area IS NULL OR v_parent_area <= 0 THEN
    -- Cannot calculate quotas without parent area
    RETURN NEW;
  END IF;

  -- Calculate total unit area (excluding common units)
  SELECT COALESCE(SUM(computed_area), 0) INTO v_total_unit_area
  FROM apr.section_geometries
  WHERE survey_plan_id = v_survey_plan_id
    AND section_type != 'common';

  IF v_total_unit_area = 0 THEN
    -- Cannot calculate quotas with zero total area
    RETURN NEW;
  END IF;

  -- Calculate common property area
  v_common_area := v_parent_area - v_total_unit_area;

  -- Calculate quota for this unit: (unit_area / total_unit_area) * 100
  v_new_quota := ROUND((NEW.computed_area / v_total_unit_area) * 100, 4);

  -- Calculate common area share
  v_common_share := ROUND((v_new_quota / 100) * v_common_area, 2);

  -- Update quota and common area share
  NEW.participation_quota := v_new_quota;
  NEW.common_area_share := v_common_share;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION apr.recalculate_quotas_on_update IS 
  'Automatically recalculates participation quota when unit area changes';

-- ============================================================================
-- TRIGGER: Recalculate Quotas on Update
-- ============================================================================
DROP TRIGGER IF EXISTS trigger_recalculate_quotas_on_update ON apr.section_geometries;
CREATE TRIGGER trigger_recalculate_quotas_on_update
  BEFORE UPDATE OF computed_area ON apr.section_geometries
  FOR EACH ROW
  WHEN (OLD.computed_area IS DISTINCT FROM NEW.computed_area)
  EXECUTE FUNCTION apr.recalculate_quotas_on_update();

-- ============================================================================
-- FUNCTION: Recalculate All Quotas for Survey Plan
-- ============================================================================
CREATE OR REPLACE FUNCTION apr.recalculate_all_quotas(
  p_survey_plan_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_unit_area NUMERIC;
  v_parent_area NUMERIC;
  v_common_area NUMERIC;
  v_unit RECORD;
  v_total_quota NUMERIC := 0;
  v_adjustment NUMERIC;
  v_largest_quota NUMERIC := 0;
  v_largest_section_id UUID;
  v_results JSONB := '[]'::jsonb;
BEGIN
  -- Get parent parcel area
  SELECT parent_parcel_area INTO v_parent_area
  FROM apr.survey_sectional_plans
  WHERE id = p_survey_plan_id;

  IF v_parent_area IS NULL OR v_parent_area <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Parent parcel area not found or invalid'
    );
  END IF;

  -- Calculate total unit area (excluding common units)
  SELECT COALESCE(SUM(computed_area), 0) INTO v_total_unit_area
  FROM apr.section_geometries
  WHERE survey_plan_id = p_survey_plan_id
    AND section_type != 'common';

  IF v_total_unit_area = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Total unit area is zero'
    );
  END IF;

  -- Calculate common property area
  v_common_area := v_parent_area - v_total_unit_area;

  -- Calculate quotas for all units
  FOR v_unit IN 
    SELECT id, section_number, computed_area
    FROM apr.section_geometries
    WHERE survey_plan_id = p_survey_plan_id
      AND section_type != 'common'
    ORDER BY computed_area DESC
  LOOP
    DECLARE
      v_quota NUMERIC;
      v_common_share NUMERIC;
    BEGIN
      -- Calculate quota: (unit_area / total_unit_area) * 100
      v_quota := ROUND((v_unit.computed_area / v_total_unit_area) * 100, 4);
      v_total_quota := v_total_quota + v_quota;

      -- Calculate common area share
      v_common_share := ROUND((v_quota / 100) * v_common_area, 2);

      -- Update quota and common area share
      UPDATE apr.section_geometries
      SET 
        participation_quota = v_quota,
        common_area_share = v_common_share,
        updated_at = NOW()
      WHERE id = v_unit.id;

      -- Track largest quota for adjustment
      IF v_quota > v_largest_quota THEN
        v_largest_quota := v_quota;
        v_largest_section_id := v_unit.id;
      END IF;

      -- Add to results
      v_results := v_results || jsonb_build_object(
        'section_number', v_unit.section_number,
        'quota', v_quota,
        'common_area_share', v_common_share
      );
    END;
  END LOOP;

  -- Adjust to ensure total equals 100.0000%
  v_adjustment := 100.0 - ROUND(v_total_quota, 4);
  IF ABS(v_adjustment) > 0.0001 AND v_largest_section_id IS NOT NULL THEN
    -- Apply adjustment to largest unit
    UPDATE apr.section_geometries
    SET 
      participation_quota = ROUND(participation_quota + v_adjustment, 4),
      common_area_share = ROUND(((participation_quota + v_adjustment) / 100) * v_common_area, 2),
      updated_at = NOW()
    WHERE id = v_largest_section_id;

    -- Update result for adjusted unit
    SELECT section_number INTO v_unit.section_number
    FROM apr.section_geometries
    WHERE id = v_largest_section_id;

    v_results := jsonb_set(
      v_results,
      ARRAY[(SELECT ordinality - 1 FROM jsonb_array_elements(v_results) WITH ORDINALITY WHERE value->>'section_number' = v_unit.section_number)::text - 1, 'quota'],
      to_jsonb(ROUND(v_largest_quota + v_adjustment, 4))
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'total_quota', ROUND(v_total_quota + v_adjustment, 4),
    'adjustment_applied', ABS(v_adjustment) > 0.0001,
    'adjustment', v_adjustment,
    'results', v_results
  );
END;
$$;

COMMENT ON FUNCTION apr.recalculate_all_quotas IS 
  'Recalculates all participation quotas for a survey plan and ensures they sum to 100%';

GRANT EXECUTE ON FUNCTION apr.recalculate_all_quotas(UUID) TO authenticated;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Quota recalculation trigger created';
  RAISE NOTICE '✅ Recalculate all quotas function created';
END $$;

