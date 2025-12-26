-- Scheme Number Allocation System Migration
-- Creates tables and functions for unique scheme number allocation
-- Format: SS/YYYY/PROVINCE/NNN (e.g., SS/2025/HARARE/001)

-- ============================================================================
-- SCHEME NUMBER ALLOCATIONS TABLE
-- ============================================================================
-- Tracks allocated scheme numbers with provincial and yearly organization
CREATE TABLE IF NOT EXISTS apr.scheme_number_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Number components
  year INTEGER NOT NULL, -- e.g., 2025
  province_code TEXT NOT NULL, -- e.g., "HARARE", "BULAWAYO", "MASVINGO"
  sequence_number INTEGER NOT NULL, -- e.g., 001, 002, 003
  
  -- Full formatted number
  scheme_number TEXT UNIQUE NOT NULL, -- e.g., "SS/2025/HARARE/001"
  
  -- Allocation status
  status TEXT NOT NULL DEFAULT 'reserved' CHECK (
    status IN ('reserved', 'allocated', 'cancelled', 'released')
  ),
  
  -- Reference to scheme (if allocated)
  scheme_id UUID REFERENCES apr.sectional_schemes(id),
  
  -- Allocation metadata
  allocated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  allocated_by UUID REFERENCES auth.users(id),
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancelled_by UUID REFERENCES auth.users(id),
  cancellation_reason TEXT,
  
  -- Reservation metadata
  reserved_at TIMESTAMP WITH TIME ZONE,
  reserved_by UUID REFERENCES auth.users(id),
  reservation_expires_at TIMESTAMP WITH TIME ZONE, -- Reservation expiry (e.g., 24 hours)
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Unique constraint: one sequence number per province/year
  UNIQUE(year, province_code, sequence_number)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_scheme_number_allocations_year_province 
  ON apr.scheme_number_allocations(year, province_code);
CREATE INDEX IF NOT EXISTS idx_scheme_number_allocations_scheme_number 
  ON apr.scheme_number_allocations(scheme_number);
CREATE INDEX IF NOT EXISTS idx_scheme_number_allocations_status 
  ON apr.scheme_number_allocations(status);
CREATE INDEX IF NOT EXISTS idx_scheme_number_allocations_scheme_id 
  ON apr.scheme_number_allocations(scheme_id);
CREATE INDEX IF NOT EXISTS idx_scheme_number_allocations_reservation_expires 
  ON apr.scheme_number_allocations(reservation_expires_at) 
  WHERE status = 'reserved';

-- ============================================================================
-- PROVINCE CODES TABLE
-- ============================================================================
-- Valid province codes for scheme numbering
CREATE TABLE IF NOT EXISTS apr.province_codes (
  code TEXT PRIMARY KEY, -- e.g., "HARARE", "BULAWAYO"
  name TEXT NOT NULL, -- Full province name
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default province codes (Zimbabwe provinces)
INSERT INTO apr.province_codes (code, name) VALUES
  ('HARARE', 'Harare'),
  ('BULAWAYO', 'Bulawayo'),
  ('MANICALAND', 'Manicaland'),
  ('MASHONALAND_CENTRAL', 'Mashonaland Central'),
  ('MASHONALAND_EAST', 'Mashonaland East'),
  ('MASHONALAND_WEST', 'Mashonaland West'),
  ('MASVINGO', 'Masvingo'),
  ('MATABELELAND_NORTH', 'Matabeleland North'),
  ('MATABELELAND_SOUTH', 'Matabeleland South'),
  ('MIDLANDS', 'Midlands')
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- SCHEME NUMBER ALLOCATION FUNCTION
-- ============================================================================
-- Atomic function to allocate next available scheme number
CREATE OR REPLACE FUNCTION apr.allocate_scheme_number(
  p_province_code TEXT,
  p_year INTEGER DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_reserve_duration_hours INTEGER DEFAULT 24
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_year INTEGER;
  v_next_sequence INTEGER;
  v_scheme_number TEXT;
  v_allocation_id UUID;
  v_reservation_expires TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Validate province code
  IF NOT EXISTS (SELECT 1 FROM apr.province_codes WHERE code = p_province_code AND is_active = true) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid province code: ' || p_province_code
    );
  END IF;

  -- Use current year if not specified
  v_year := COALESCE(p_year, EXTRACT(YEAR FROM NOW())::INTEGER);

  -- Lock the row to prevent concurrent allocations
  -- Get next sequence number for province/year
  SELECT COALESCE(MAX(sequence_number), 0) + 1 INTO v_next_sequence
  FROM apr.scheme_number_allocations
  WHERE year = v_year
    AND province_code = p_province_code
    AND status IN ('allocated', 'reserved')
  FOR UPDATE;

  -- Format scheme number: SS/YYYY/PROVINCE/NNN
  v_scheme_number := 'SS/' || v_year || '/' || UPPER(p_province_code) || '/' || 
                     LPAD(v_next_sequence::TEXT, 3, '0');

  -- Calculate reservation expiry
  v_reservation_expires := NOW() + (p_reserve_duration_hours || ' hours')::INTERVAL;

  -- Create allocation record
  INSERT INTO apr.scheme_number_allocations (
    year,
    province_code,
    sequence_number,
    scheme_number,
    status,
    allocated_by,
    reserved_at,
    reserved_by,
    reservation_expires_at
  ) VALUES (
    v_year,
    UPPER(p_province_code),
    v_next_sequence,
    v_scheme_number,
    'reserved',
    p_user_id,
    NOW(),
    p_user_id,
    v_reservation_expires
  )
  RETURNING id INTO v_allocation_id;

  RETURN jsonb_build_object(
    'success', true,
    'scheme_number', v_scheme_number,
    'allocation_id', v_allocation_id,
    'year', v_year,
    'province_code', UPPER(p_province_code),
    'sequence_number', v_next_sequence,
    'reservation_expires_at', v_reservation_expires
  );
END;
$$;

-- ============================================================================
-- CONFIRM SCHEME NUMBER ALLOCATION FUNCTION
-- ============================================================================
-- Confirms a reserved number allocation (links to scheme)
CREATE OR REPLACE FUNCTION apr.confirm_scheme_number_allocation(
  p_allocation_id UUID,
  p_scheme_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_allocation RECORD;
BEGIN
  -- Get allocation record
  SELECT * INTO v_allocation
  FROM apr.scheme_number_allocations
  WHERE id = p_allocation_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Allocation not found'
    );
  END IF;

  -- Check if reservation expired
  IF v_allocation.status = 'reserved' AND 
     v_allocation.reservation_expires_at < NOW() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Reservation expired'
    );
  END IF;

  -- Check if already allocated
  IF v_allocation.status = 'allocated' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Number already allocated'
    );
  END IF;

  -- Update allocation status
  UPDATE apr.scheme_number_allocations
  SET
    status = 'allocated',
    scheme_id = p_scheme_id,
    allocated_at = NOW(),
    updated_at = NOW()
  WHERE id = p_allocation_id;

  RETURN jsonb_build_object(
    'success', true,
    'scheme_number', v_allocation.scheme_number,
    'scheme_id', p_scheme_id
  );
END;
$$;

-- ============================================================================
-- CANCEL SCHEME NUMBER ALLOCATION FUNCTION
-- ============================================================================
-- Cancels a reserved or allocated number (for gap filling)
CREATE OR REPLACE FUNCTION apr.cancel_scheme_number_allocation(
  p_allocation_id UUID,
  p_user_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE apr.scheme_number_allocations
  SET
    status = 'cancelled',
    cancelled_at = NOW(),
    cancelled_by = p_user_id,
    cancellation_reason = p_reason,
    updated_at = NOW()
  WHERE id = p_allocation_id
    AND status IN ('reserved', 'allocated');

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Allocation not found or cannot be cancelled'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Allocation cancelled'
  );
END;
$$;

-- ============================================================================
-- GET NEXT AVAILABLE SEQUENCE FUNCTION
-- ============================================================================
-- Gets next available sequence number (for gap filling)
CREATE OR REPLACE FUNCTION apr.get_next_available_sequence(
  p_province_code TEXT,
  p_year INTEGER DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_year INTEGER;
  v_max_sequence INTEGER;
  v_gap_sequence INTEGER;
BEGIN
  v_year := COALESCE(p_year, EXTRACT(YEAR FROM NOW())::INTEGER);

  -- Get max sequence number
  SELECT COALESCE(MAX(sequence_number), 0) INTO v_max_sequence
  FROM apr.scheme_number_allocations
  WHERE year = v_year
    AND province_code = p_province_code
    AND status IN ('allocated', 'reserved');

  -- Check for gaps (cancelled numbers)
  SELECT MIN(sequence_number) INTO v_gap_sequence
  FROM apr.scheme_number_allocations
  WHERE year = v_year
    AND province_code = p_province_code
    AND status = 'cancelled'
    AND sequence_number > 0;

  -- Return gap sequence if found, otherwise next sequence
  RETURN COALESCE(v_gap_sequence, v_max_sequence + 1);
END;
$$;

-- ============================================================================
-- VALIDATE SCHEME NUMBER FORMAT FUNCTION
-- ============================================================================
-- Validates scheme number format
CREATE OR REPLACE FUNCTION apr.validate_scheme_number_format(
  p_scheme_number TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_parts TEXT[];
  v_prefix TEXT;
  v_year INTEGER;
  v_province TEXT;
  v_sequence TEXT;
BEGIN
  -- Split by '/'
  v_parts := string_to_array(p_scheme_number, '/');

  -- Check format: SS/YYYY/PROVINCE/NNN
  IF array_length(v_parts, 1) != 4 THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'Invalid format. Expected: SS/YYYY/PROVINCE/NNN'
    );
  END IF;

  v_prefix := v_parts[1];
  v_year := v_parts[2]::INTEGER;
  v_province := v_parts[3];
  v_sequence := v_parts[4];

  -- Validate prefix
  IF v_prefix != 'SS' THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'Invalid prefix. Expected: SS'
    );
  END IF;

  -- Validate year (reasonable range)
  IF v_year < 2000 OR v_year > 2100 THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'Invalid year. Must be between 2000 and 2100'
    );
  END IF;

  -- Validate province code
  IF NOT EXISTS (SELECT 1 FROM apr.province_codes WHERE code = v_province) THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'Invalid province code: ' || v_province
    );
  END IF;

  -- Validate sequence (3 digits)
  IF NOT (v_sequence ~ '^[0-9]{3}$') THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'Invalid sequence. Must be 3 digits'
    );
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'components', jsonb_build_object(
      'prefix', v_prefix,
      'year', v_year,
      'province', v_province,
      'sequence', v_sequence::INTEGER
    )
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION apr.allocate_scheme_number(TEXT, INTEGER, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION apr.confirm_scheme_number_allocation(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION apr.cancel_scheme_number_allocation(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION apr.get_next_available_sequence(TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION apr.validate_scheme_number_format(TEXT) TO authenticated;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE apr.scheme_number_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE apr.province_codes ENABLE ROW LEVEL SECURITY;

-- Scheme number allocations policies
CREATE POLICY "Users can view scheme number allocations"
  ON apr.scheme_number_allocations
  FOR SELECT
  TO authenticated
  USING (true); -- All authenticated users can view allocations

CREATE POLICY "Registrars can manage scheme number allocations"
  ON apr.scheme_number_allocations
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM apr.user_profiles
      WHERE id = auth.uid() AND role IN ('registrar', 'admin')
    )
  );

-- Province codes policies
CREATE POLICY "Users can view province codes"
  ON apr.province_codes
  FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE apr.scheme_number_allocations IS 
  'Tracks allocated scheme numbers with provincial and yearly organization. Format: SS/YYYY/PROVINCE/NNN';

COMMENT ON TABLE apr.province_codes IS 
  'Valid province codes for scheme numbering system';

COMMENT ON FUNCTION apr.allocate_scheme_number IS 
  'Atomically allocates next available scheme number for province/year. Uses row-level locking to prevent duplicates.';

COMMENT ON FUNCTION apr.confirm_scheme_number_allocation IS 
  'Confirms a reserved number allocation by linking it to a scheme.';

COMMENT ON FUNCTION apr.cancel_scheme_number_allocation IS 
  'Cancels a reserved or allocated number, making it available for gap filling.';

COMMENT ON FUNCTION apr.get_next_available_sequence IS 
  'Gets next available sequence number, checking for gaps from cancelled numbers.';

COMMENT ON FUNCTION apr.validate_scheme_number_format IS 
  'Validates scheme number format: SS/YYYY/PROVINCE/NNN';

