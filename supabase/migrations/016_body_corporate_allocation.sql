-- Body Corporate Registration Number Allocation
-- Creates RPC functions for allocating unique Body Corporate registration numbers
-- Format: BC/YYYY/PROVINCE/NNN (e.g., BC/2025/HARARE/001)

-- ============================================================================
-- BODY CORPORATE NUMBER ALLOCATION TABLE
-- ============================================================================
-- Tracks Body Corporate number allocations (similar to scheme numbers)
CREATE TABLE IF NOT EXISTS apr.body_corporate_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Allocation details
  registration_number TEXT UNIQUE NOT NULL, -- e.g., "BC/2025/HARARE/001"
  year INTEGER NOT NULL,
  province_code TEXT NOT NULL REFERENCES apr.province_codes(code),
  sequence_number INTEGER NOT NULL,
  
  -- Reservation information
  reserved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reserved_until TIMESTAMP WITH TIME ZONE,
  reservation_status TEXT NOT NULL DEFAULT 'reserved' CHECK (
    reservation_status IN ('reserved', 'confirmed', 'cancelled')
  ),
  
  -- Link to Body Corporate (when confirmed)
  body_corporate_id UUID REFERENCES apr.body_corporates(id),
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint per province/year/sequence
  UNIQUE(year, province_code, sequence_number)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_body_corporate_allocations_registration_number 
  ON apr.body_corporate_allocations(registration_number);
CREATE INDEX IF NOT EXISTS idx_body_corporate_allocations_year_province 
  ON apr.body_corporate_allocations(year, province_code);
CREATE INDEX IF NOT EXISTS idx_body_corporate_allocations_status 
  ON apr.body_corporate_allocations(reservation_status);
CREATE INDEX IF NOT EXISTS idx_body_corporate_allocations_body_corporate_id 
  ON apr.body_corporate_allocations(body_corporate_id);

-- ============================================================================
-- RPC FUNCTION: Allocate Body Corporate Number
-- ============================================================================
CREATE OR REPLACE FUNCTION apr.allocate_body_corporate_number(
  p_province_code TEXT,
  p_year INTEGER DEFAULT EXTRACT(YEAR FROM NOW())::INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sequence_number INTEGER;
  v_registration_number TEXT;
  v_allocation_id UUID;
  v_reserved_until TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Validate province code
  IF NOT EXISTS (SELECT 1 FROM apr.province_codes WHERE code = p_province_code) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid province code: ' || p_province_code
    );
  END IF;

  -- Lock row to prevent concurrent allocations
  PERFORM 1 FROM apr.body_corporate_allocations
  WHERE year = p_year AND province_code = p_province_code
  FOR UPDATE;

  -- Get next available sequence number
  SELECT COALESCE(MAX(sequence_number), 0) + 1
  INTO v_sequence_number
  FROM apr.body_corporate_allocations
  WHERE year = p_year 
    AND province_code = p_province_code
    AND reservation_status IN ('confirmed', 'reserved');

  -- Format registration number: BC/YYYY/PROVINCE/NNN
  v_registration_number := 'BC/' || p_year || '/' || p_province_code || '/' || 
    LPAD(v_sequence_number::TEXT, 3, '0');

  -- Set reservation expiry (24 hours default)
  v_reserved_until := NOW() + INTERVAL '24 hours';

  -- Insert allocation record
  INSERT INTO apr.body_corporate_allocations (
    registration_number,
    year,
    province_code,
    sequence_number,
    reserved_until,
    reservation_status
  )
  VALUES (
    v_registration_number,
    p_year,
    p_province_code,
    v_sequence_number,
    v_reserved_until,
    'reserved'
  )
  RETURNING id INTO v_allocation_id;

  RETURN jsonb_build_object(
    'success', true,
    'registration_number', v_registration_number,
    'allocation_id', v_allocation_id,
    'year', p_year,
    'province_code', p_province_code,
    'sequence_number', v_sequence_number,
    'reserved_until', v_reserved_until
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION apr.allocate_body_corporate_number(TEXT, INTEGER) 
  TO authenticated;
GRANT EXECUTE ON FUNCTION apr.allocate_body_corporate_number(TEXT, INTEGER) 
  TO anon;

COMMENT ON FUNCTION apr.allocate_body_corporate_number IS 
  'Allocates a unique Body Corporate registration number in format BC/YYYY/PROVINCE/NNN';

-- ============================================================================
-- RPC FUNCTION: Confirm Body Corporate Number Allocation
-- ============================================================================
CREATE OR REPLACE FUNCTION apr.confirm_body_corporate_allocation(
  p_allocation_id UUID,
  p_body_corporate_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_allocation apr.body_corporate_allocations%ROWTYPE;
BEGIN
  -- Get allocation
  SELECT * INTO v_allocation
  FROM apr.body_corporate_allocations
  WHERE id = p_allocation_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Allocation not found'
    );
  END IF;

  -- Check if already confirmed
  IF v_allocation.reservation_status = 'confirmed' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Allocation already confirmed'
    );
  END IF;

  -- Check if reservation expired
  IF v_allocation.reserved_until < NOW() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Reservation expired'
    );
  END IF;

  -- Update allocation status
  UPDATE apr.body_corporate_allocations
  SET 
    reservation_status = 'confirmed',
    body_corporate_id = p_body_corporate_id,
    updated_at = NOW()
  WHERE id = p_allocation_id;

  RETURN jsonb_build_object(
    'success', true,
    'registration_number', v_allocation.registration_number
  );
END;
$$;

GRANT EXECUTE ON FUNCTION apr.confirm_body_corporate_allocation(UUID, UUID) 
  TO authenticated;

COMMENT ON FUNCTION apr.confirm_body_corporate_allocation IS 
  'Confirms a Body Corporate number allocation and links it to the Body Corporate record';

-- ============================================================================
-- RPC FUNCTION: Cancel Body Corporate Number Allocation
-- ============================================================================
CREATE OR REPLACE FUNCTION apr.cancel_body_corporate_allocation(
  p_allocation_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update allocation status to cancelled
  UPDATE apr.body_corporate_allocations
  SET 
    reservation_status = 'cancelled',
    updated_at = NOW()
  WHERE id = p_allocation_id
    AND reservation_status = 'reserved';

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Allocation not found or cannot be cancelled'
    );
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION apr.cancel_body_corporate_allocation(UUID) 
  TO authenticated;

COMMENT ON FUNCTION apr.cancel_body_corporate_allocation IS 
  'Cancels a reserved Body Corporate number allocation';

-- ============================================================================
-- TRIGGER: Auto-create Body Corporate on Scheme Registration
-- ============================================================================
-- This trigger automatically creates a Body Corporate when a scheme is registered
CREATE OR REPLACE FUNCTION apr.auto_create_body_corporate()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_scheme_number TEXT;
  v_scheme_name TEXT;
  v_province_code TEXT;
  v_body_corporate_id UUID;
  v_registration_number TEXT;
  v_allocation JSONB;
BEGIN
  -- Only trigger on status change to 'registered'
  IF NEW.status = 'registered' AND (OLD.status IS NULL OR OLD.status != 'registered') THEN
    -- Extract province code from scheme number (format: SS/YYYY/PROVINCE/NNN)
    v_scheme_number := NEW.scheme_number;
    v_scheme_name := NEW.scheme_name;
    
    -- Extract province code (third component)
    v_province_code := SPLIT_PART(v_scheme_number, '/', 3);
    
    -- Allocate Body Corporate number
    SELECT apr.allocate_body_corporate_number(v_province_code) INTO v_allocation;
    
    IF (v_allocation->>'success')::boolean = false THEN
      RAISE WARNING 'Failed to allocate Body Corporate number: %', v_allocation->>'error';
      RETURN NEW;
    END IF;
    
    v_registration_number := v_allocation->>'registration_number';
    
    -- Create Body Corporate
    INSERT INTO apr.body_corporates (
      scheme_id,
      registration_number,
      name,
      registration_date,
      registered_by,
      status,
      trustee_count,
      initial_trustees
    )
    VALUES (
      NEW.id,
      v_registration_number,
      v_scheme_name || ' Body Corporate',
      COALESCE(NEW.registration_date, NOW()),
      NEW.registered_by,
      'active',
      0,
      '[]'::jsonb
    )
    RETURNING id INTO v_body_corporate_id;
    
    -- Update scheme with Body Corporate reference
    UPDATE apr.sectional_schemes
    SET body_corporate_id = v_body_corporate_id
    WHERE id = NEW.id;
    
    -- Confirm allocation
    PERFORM apr.confirm_body_corporate_allocation(
      (v_allocation->>'allocation_id')::UUID,
      v_body_corporate_id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_auto_create_body_corporate ON apr.sectional_schemes;
CREATE TRIGGER trigger_auto_create_body_corporate
  AFTER UPDATE OF status ON apr.sectional_schemes
  FOR EACH ROW
  EXECUTE FUNCTION apr.auto_create_body_corporate();

COMMENT ON TRIGGER trigger_auto_create_body_corporate ON apr.sectional_schemes IS 
  'Automatically creates a Body Corporate when a scheme status changes to registered';

