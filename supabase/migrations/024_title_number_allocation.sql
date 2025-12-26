-- ============================================================================
-- TITLE NUMBER ALLOCATION SYSTEM
-- ============================================================================
-- System for allocating unique title numbers
-- Format: T/YYYY/PROVINCE/NNN (e.g., T/2025/HARARE/001)

-- Title number allocations table
CREATE TABLE IF NOT EXISTS apr.title_number_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Allocation details
  title_number TEXT UNIQUE NOT NULL, -- e.g., "T/2025/HARARE/001"
  year INTEGER NOT NULL,
  province_code TEXT NOT NULL,
  sequence_number INTEGER NOT NULL,
  
  -- Reservation
  reserved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reserved_by UUID REFERENCES auth.users(id),
  reservation_expires_at TIMESTAMP WITH TIME ZONE,
  
  -- Confirmation
  confirmed_at TIMESTAMP WITH TIME ZONE,
  confirmed_by UUID REFERENCES auth.users(id),
  title_id UUID REFERENCES apr.sectional_titles(id),
  
  -- Cancellation
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancelled_by UUID REFERENCES auth.users(id),
  cancellation_reason TEXT,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'reserved' CHECK (
    status IN ('reserved', 'confirmed', 'cancelled')
  ),
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Unique constraint: one sequence number per province/year
  UNIQUE(year, province_code, sequence_number)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_title_number_allocations_title_number 
  ON apr.title_number_allocations(title_number);
CREATE INDEX IF NOT EXISTS idx_title_number_allocations_year_province 
  ON apr.title_number_allocations(year, province_code);
CREATE INDEX IF NOT EXISTS idx_title_number_allocations_status 
  ON apr.title_number_allocations(status);
CREATE INDEX IF NOT EXISTS idx_title_number_allocations_title_id 
  ON apr.title_number_allocations(title_id);

-- ============================================================================
-- RPC FUNCTIONS
-- ============================================================================

-- Allocate next available title number
CREATE OR REPLACE FUNCTION apr.allocate_title_number(
  p_province_code TEXT,
  p_year INTEGER DEFAULT NULL,
  p_user_id UUID,
  p_reserve_duration_hours INTEGER DEFAULT 24
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_year INTEGER;
  v_sequence_number INTEGER;
  v_title_number TEXT;
  v_allocation_id UUID;
  v_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Use current year if not provided
  v_year := COALESCE(p_year, EXTRACT(YEAR FROM NOW())::INTEGER);
  
  -- Validate province code
  IF p_province_code NOT IN (
    'HARARE', 'BULAWAYO', 'MANICALAND', 'MASHONALAND_CENTRAL',
    'MASHONALAND_EAST', 'MASHONALAND_WEST', 'MASVINGO',
    'MATABELELAND_NORTH', 'MATABELELAND_SOUTH', 'MIDLANDS'
  ) THEN
    RAISE EXCEPTION 'Invalid province code: %', p_province_code;
  END IF;
  
  -- Get next sequence number (atomic operation)
  SELECT COALESCE(MAX(sequence_number), 0) + 1
  INTO v_sequence_number
  FROM apr.title_number_allocations
  WHERE year = v_year
    AND province_code = p_province_code
    AND status = 'confirmed';
  
  -- Format title number
  v_title_number := format('T/%s/%s/%03d', v_year, p_province_code, v_sequence_number);
  
  -- Calculate expiration
  v_expires_at := NOW() + (p_reserve_duration_hours || ' hours')::INTERVAL;
  
  -- Create reservation
  INSERT INTO apr.title_number_allocations (
    title_number,
    year,
    province_code,
    sequence_number,
    reserved_by,
    reservation_expires_at,
    status
  ) VALUES (
    v_title_number,
    v_year,
    p_province_code,
    v_sequence_number,
    p_user_id,
    v_expires_at,
    'reserved'
  )
  RETURNING id INTO v_allocation_id;
  
  -- Return allocation details
  RETURN jsonb_build_object(
    'success', true,
    'title_number', v_title_number,
    'allocation_id', v_allocation_id,
    'year', v_year,
    'province_code', p_province_code,
    'sequence_number', v_sequence_number,
    'reservation_expires_at', v_expires_at
  );
END;
$$;

-- Confirm title number allocation
CREATE OR REPLACE FUNCTION apr.confirm_title_number_allocation(
  p_allocation_id UUID,
  p_title_id UUID,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_title_number TEXT;
BEGIN
  -- Update allocation
  UPDATE apr.title_number_allocations
  SET 
    status = 'confirmed',
    confirmed_at = NOW(),
    confirmed_by = p_user_id,
    title_id = p_title_id,
    updated_at = NOW()
  WHERE id = p_allocation_id
    AND status = 'reserved'
  RETURNING title_number INTO v_title_number;
  
  IF v_title_number IS NULL THEN
    RAISE EXCEPTION 'Allocation not found or already confirmed/cancelled';
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'title_number', v_title_number
  );
END;
$$;

-- Cancel title number allocation
CREATE OR REPLACE FUNCTION apr.cancel_title_number_allocation(
  p_allocation_id UUID,
  p_user_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE apr.title_number_allocations
  SET 
    status = 'cancelled',
    cancelled_at = NOW(),
    cancelled_by = p_user_id,
    cancellation_reason = p_reason,
    updated_at = NOW()
  WHERE id = p_allocation_id
    AND status = 'reserved';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Allocation not found or cannot be cancelled';
  END IF;
  
  RETURN jsonb_build_object('success', true);
END;
$$;

-- Validate title number format
CREATE OR REPLACE FUNCTION apr.validate_title_number_format(
  p_title_number TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_parts TEXT[];
  v_year INTEGER;
  v_province TEXT;
  v_sequence INTEGER;
BEGIN
  -- Parse format: T/YYYY/PROVINCE/NNN
  v_parts := string_to_array(p_title_number, '/');
  
  IF array_length(v_parts, 1) != 4 OR v_parts[1] != 'T' THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'Invalid format. Expected: T/YYYY/PROVINCE/NNN'
    );
  END IF;
  
  BEGIN
    v_year := v_parts[2]::INTEGER;
    v_province := v_parts[3];
    v_sequence := v_parts[4]::INTEGER;
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'Invalid number format in title number'
    );
  END;
  
  -- Validate province
  IF v_province NOT IN (
    'HARARE', 'BULAWAYO', 'MANICALAND', 'MASHONALAND_CENTRAL',
    'MASHONALAND_EAST', 'MASHONALAND_WEST', 'MASVINGO',
    'MATABELELAND_NORTH', 'MATABELELAND_SOUTH', 'MIDLANDS'
  ) THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'Invalid province code'
    );
  END IF;
  
  RETURN jsonb_build_object(
    'valid', true,
    'components', jsonb_build_object(
      'prefix', 'T',
      'year', v_year,
      'province', v_province,
      'sequence', v_sequence
    )
  );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION apr.allocate_title_number(TEXT, INTEGER, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION apr.confirm_title_number_allocation(UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION apr.cancel_title_number_allocation(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION apr.validate_title_number_format(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION apr.validate_title_number_format(TEXT) TO anon;

-- Comments
COMMENT ON FUNCTION apr.allocate_title_number IS 'Allocates next available title number with atomic reservation';
COMMENT ON FUNCTION apr.confirm_title_number_allocation IS 'Confirms title number allocation and links to title record';
COMMENT ON FUNCTION apr.cancel_title_number_allocation IS 'Cancels a reserved title number allocation';
COMMENT ON FUNCTION apr.validate_title_number_format IS 'Validates title number format: T/YYYY/PROVINCE/NNN';

