# Manual Admin User Creation Guide

Due to JWT authentication issues with local Supabase, here are alternative methods to create an admin user:

## Method 1: Enable Auto-Confirm (Recommended for Local Development)

Edit your Supabase Docker configuration to enable auto-confirm:

1. Find your `docker-compose.yml` or Supabase config
2. Set `GOTRUE_MAILER_AUTOCONFIRM=true` in the `supabase-auth` service
3. Restart Supabase: `docker-compose restart supabase-auth`
4. Run: `npm run create:admin`

## Method 2: Use Supabase Studio

1. Open Supabase Studio: http://localhost:54323
2. Go to Authentication → Users
3. Click "Add User"
4. Enter:
   - Email: `admin@apr.local`
   - Password: `admin123`
   - Auto Confirm User: ✅ (check this)
5. After user is created, run this SQL in the SQL Editor:

```sql
INSERT INTO apr.user_profiles (id, name, email, role, status, organization)
SELECT 
  id,
  'System Administrator',
  email,
  'admin',
  'active',
  'System Administration'
FROM auth.users
WHERE email = 'admin@apr.local'
ON CONFLICT (id) DO UPDATE SET 
  role = 'admin',
  status = 'active';
```

## Method 3: Direct SQL (Advanced)

If you have direct database access, you can create the user via SQL. However, password hashing is complex, so Method 2 is recommended.

## After Creating the User

1. Login at: http://localhost:3000/login
2. Email: `admin@apr.local`
3. Password: `admin123`
4. **Important**: Change the password after first login!

