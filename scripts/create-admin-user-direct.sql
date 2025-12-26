-- Create admin user directly via SQL
-- This bypasses email confirmation issues in local Supabase

-- Insert into auth.users
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  confirmation_token,
  recovery_token
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@apr.local',
  crypt('admin123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"name":"System Administrator","role":"admin"}',
  false,
  '',
  ''
)
ON CONFLICT (email) DO UPDATE SET
  email_confirmed_at = NOW(),
  updated_at = NOW()
RETURNING id;

-- Then insert into apr.user_profiles (run this after getting the user ID)
-- INSERT INTO apr.user_profiles (id, name, email, role, status, organization)
-- VALUES ('<user-id-from-above>', 'System Administrator', 'admin@apr.local', 'admin', 'active', 'System Administration')
-- ON CONFLICT (id) DO UPDATE SET role = 'admin', status = 'active';

