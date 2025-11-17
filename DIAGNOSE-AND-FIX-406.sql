-- =================================================================
-- COMPREHENSIVE FIX FOR 406 ERROR ON PROFILES TABLE
-- =================================================================
-- This script will diagnose and fix the 406 "Not Acceptable" error
-- Run this in Supabase SQL Editor
-- =================================================================

-- STEP 1: Check current RLS status
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'profiles';

-- STEP 2: Check existing policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

-- STEP 3: Drop ALL existing policies (clean slate)
DROP POLICY IF EXISTS "Service role has full access" ON profiles;
DROP POLICY IF EXISTS "Public can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Anyone can view public profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;
DROP POLICY IF EXISTS "anon can select profiles" ON profiles;
DROP POLICY IF EXISTS "authenticated can select profiles" ON profiles;
DROP POLICY IF EXISTS "public can select profiles" ON profiles;
DROP POLICY IF EXISTS "anon_select_profiles" ON profiles;
DROP POLICY IF EXISTS "authenticated_select_profiles" ON profiles;
DROP POLICY IF EXISTS "public_select_profiles" ON profiles;
DROP POLICY IF EXISTS "service_role_all_access" ON profiles;
DROP POLICY IF EXISTS "authenticated_insert_own_profile" ON profiles;
DROP POLICY IF EXISTS "authenticated_update_own_profile" ON profiles;

-- STEP 4: Ensure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- STEP 5: Create PERMISSIVE policy for anon role (used by frontend)
CREATE POLICY "anon_select_profiles"
  ON profiles
  FOR SELECT
  TO anon
  USING (true);

-- STEP 6: Create PERMISSIVE policy for authenticated role
CREATE POLICY "authenticated_select_profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- STEP 7: Create PERMISSIVE policy for public role
CREATE POLICY "public_select_profiles"
  ON profiles
  FOR SELECT
  TO public
  USING (true);

-- STEP 8: Create service role policy for ALL operations (API routes)
CREATE POLICY "service_role_all_access"
  ON profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- STEP 8b: Allow authenticated users to INSERT their own profile
CREATE POLICY "authenticated_insert_own_profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- STEP 8c: Allow authenticated users to UPDATE their own profile
CREATE POLICY "authenticated_update_own_profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- STEP 9: Grant table-level permissions to roles
GRANT SELECT ON profiles TO anon;
GRANT SELECT ON profiles TO authenticated;
GRANT SELECT ON profiles TO public;
GRANT ALL ON profiles TO service_role;
GRANT INSERT, UPDATE ON profiles TO authenticated;

-- STEP 10: Verify the fix
SELECT 
  '=== VERIFICATION ===' as step,
  tablename,
  policyname,
  roles,
  CASE 
    WHEN cmd = '*' THEN 'ALL'
    WHEN cmd = 'r' THEN 'SELECT'
    WHEN cmd = 'a' THEN 'INSERT'
    WHEN cmd = 'w' THEN 'UPDATE'
    WHEN cmd = 'd' THEN 'DELETE'
  END as operation,
  permissive
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

-- STEP 11: Test if policies work
SELECT '=== TEST QUERY ===' as step;
SELECT address, username, email FROM profiles LIMIT 1;

-- =================================================================
-- EXPECTED OUTPUT:
-- - Step 1: rls_enabled = true
-- - Step 2-10: Should show 6 policies created
-- - Step 11: Should return at least one profile row without error
-- =================================================================
