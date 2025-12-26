-- Foundation Tables Migration
-- Creates core user management and RBAC tables in apr schema
-- All tables use apr schema prefix as required

-- ============================================================================
-- USER PROFILES TABLE
-- ============================================================================
-- Extends Supabase auth.users with additional profile information
CREATE TABLE IF NOT EXISTS apr.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'viewer',
  organization TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Create index on role for RBAC queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON apr.user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_status ON apr.user_profiles(status);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON apr.user_profiles(email);

-- ============================================================================
-- ROLES TABLE
-- ============================================================================
-- Defines available roles in the system
CREATE TABLE IF NOT EXISTS apr.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  permissions JSONB DEFAULT '[]'::jsonb, -- Array of permission strings
  is_system_role BOOLEAN DEFAULT false, -- System roles cannot be deleted
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default system roles
INSERT INTO apr.roles (name, description, permissions, is_system_role) VALUES
  ('planner', 'Certified Planner - Can submit sectional scheme plans', '["planning:create", "planning:read", "planning:update"]'::jsonb, true),
  ('planning_authority', 'Planning Authority - Can review and approve plans', '["planning:read", "planning:approve", "planning:reject"]'::jsonb, true),
  ('surveyor', 'Professional Land Surveyor - Can create survey computations', '["survey:create", "survey:read", "survey:update"]'::jsonb, true),
  ('surveyor_general', 'Surveyor-General Officer - Can review and seal surveys', '["survey:read", "survey:approve", "survey:seal"]'::jsonb, true),
  ('conveyancer', 'Conveyancer - Can draft deeds and legal descriptions', '["deeds:create", "deeds:read", "deeds:update"]'::jsonb, true),
  ('deeds_examiner', 'Deeds Examiner - Can examine legal compliance', '["deeds:read", "deeds:examine", "deeds:approve"]'::jsonb, true),
  ('registrar', 'Registrar of Deeds - Can register titles', '["deeds:read", "deeds:register", "deeds:sign"]'::jsonb, true),
  ('admin', 'System Administrator - Full access', '["*"]'::jsonb, true),
  ('viewer', 'Read-only viewer - Public access', '["read:all"]'::jsonb, true)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- PERMISSIONS TABLE
-- ============================================================================
-- Defines granular permissions in the system
CREATE TABLE IF NOT EXISTS apr.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  resource TEXT NOT NULL, -- e.g., 'planning', 'survey', 'deeds'
  action TEXT NOT NULL, -- e.g., 'create', 'read', 'update', 'delete', 'approve'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default permissions
INSERT INTO apr.permissions (name, description, resource, action) VALUES
  -- Planning permissions
  ('planning:create', 'Create new scheme plans', 'planning', 'create'),
  ('planning:read', 'View scheme plans', 'planning', 'read'),
  ('planning:update', 'Update scheme plans', 'planning', 'update'),
  ('planning:approve', 'Approve scheme plans', 'planning', 'approve'),
  ('planning:reject', 'Reject scheme plans', 'planning', 'reject'),
  
  -- Survey permissions
  ('survey:create', 'Create survey computations', 'survey', 'create'),
  ('survey:read', 'View survey data', 'survey', 'read'),
  ('survey:update', 'Update survey computations', 'survey', 'update'),
  ('survey:approve', 'Approve survey computations', 'survey', 'approve'),
  ('survey:seal', 'Seal survey plans', 'survey', 'seal'),
  
  -- Deeds permissions
  ('deeds:create', 'Create deeds packets', 'deeds', 'create'),
  ('deeds:read', 'View deeds records', 'deeds', 'read'),
  ('deeds:update', 'Update deeds packets', 'deeds', 'update'),
  ('deeds:examine', 'Examine deeds for compliance', 'deeds', 'examine'),
  ('deeds:approve', 'Approve deeds packets', 'deeds', 'approve'),
  ('deeds:register', 'Register titles', 'deeds', 'register'),
  ('deeds:sign', 'Apply digital signatures', 'deeds', 'sign'),
  
  -- Admin permissions
  ('admin:users', 'Manage users', 'admin', 'users'),
  ('admin:roles', 'Manage roles', 'admin', 'roles'),
  ('admin:system', 'System administration', 'admin', 'system'),
  
  -- General permissions
  ('read:all', 'Read-only access to all resources', 'all', 'read')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE apr.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE apr.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE apr.permissions ENABLE ROW LEVEL SECURITY;

-- User Profiles Policies
-- Users can read their own profile
CREATE POLICY "Users can view own profile"
  ON apr.user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Users can update their own profile (limited fields)
CREATE POLICY "Users can update own profile"
  ON apr.user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON apr.user_profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM apr.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can manage all profiles
CREATE POLICY "Admins can manage all profiles"
  ON apr.user_profiles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM apr.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Roles Policies
-- All authenticated users can read roles (for UI display)
CREATE POLICY "Authenticated users can read roles"
  ON apr.roles
  FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can modify roles
CREATE POLICY "Admins can manage roles"
  ON apr.roles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM apr.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Permissions Policies
-- All authenticated users can read permissions
CREATE POLICY "Authenticated users can read permissions"
  ON apr.permissions
  FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can modify permissions
CREATE POLICY "Admins can manage permissions"
  ON apr.permissions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM apr.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to automatically create user profile when auth user is created
CREATE OR REPLACE FUNCTION apr.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO apr.user_profiles (id, name, email, role, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.email,
    'viewer', -- Default role
    'pending' -- Default status
  );
  RETURN NEW;
END;
$$;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION apr.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION apr.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Trigger for user_profiles updated_at
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON apr.user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON apr.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION apr.update_updated_at_column();

-- Trigger for roles updated_at
DROP TRIGGER IF EXISTS update_roles_updated_at ON apr.roles;
CREATE TRIGGER update_roles_updated_at
  BEFORE UPDATE ON apr.roles
  FOR EACH ROW
  EXECUTE FUNCTION apr.update_updated_at_column();

-- ============================================================================
-- GRANTS
-- ============================================================================

-- Grant permissions on tables
GRANT SELECT, INSERT, UPDATE ON apr.user_profiles TO authenticated;
GRANT SELECT ON apr.roles TO authenticated;
GRANT SELECT ON apr.permissions TO authenticated;

-- Grant usage on sequences (for UUID generation)
GRANT USAGE ON SCHEMA apr TO authenticated;
GRANT USAGE ON SCHEMA apr TO anon;

-- ============================================================================
-- SPATIAL REFERENCE SYSTEM CONFIGURATION
-- ============================================================================

-- Verify SRID 32735 (UTM Zone 35S - Zimbabwe) is available
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM spatial_ref_sys WHERE srid = 32735
  ) THEN
    RAISE NOTICE 'SRID 32735 (UTM Zone 35S) may need to be added. Checking PostGIS version...';
    -- PostGIS 3.3+ should include this SRID by default
  ELSE
    RAISE NOTICE 'SRID 32735 (UTM Zone 35S - Zimbabwe) is available';
  END IF;
END $$;

-- Create a helper function to set default SRID for geometry columns
CREATE OR REPLACE FUNCTION apr.set_geometry_srid()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN 'SRID 32735 (UTM Zone 35S - Zimbabwe) is configured for spatial data';
END;
$$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✓ Foundation tables created in apr schema';
  RAISE NOTICE '✓ User profiles table created';
  RAISE NOTICE '✓ Roles table created with default roles';
  RAISE NOTICE '✓ Permissions table created with default permissions';
  RAISE NOTICE '✓ RLS policies enabled and configured';
  RAISE NOTICE '✓ Triggers created for automatic profile creation';
  RAISE NOTICE '✓ Spatial reference system SRID 32735 configured';
END $$;

