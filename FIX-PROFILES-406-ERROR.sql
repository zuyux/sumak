-- URGENT FIX: 406 Error on profiles table
-- Run this in Supabase SQL Editor NOW

-- Enable RLS on profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Service role has full access" ON profiles;
DROP POLICY IF EXISTS "Public can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Anyone can view public profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;

-- Create service role policy (allows API to INSERT/UPDATE/DELETE)
CREATE POLICY "Service role has full access"
  ON profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create public read policy (allows frontend to SELECT profiles)
CREATE POLICY "Public can read all profiles"
  ON profiles
  FOR SELECT
  TO public, anon, authenticated
  USING (true);

-- Verify policies were created
SELECT 
  tablename,
  policyname,
  CASE 
    WHEN cmd = '*' THEN 'ALL operations'
    WHEN cmd = 'r' THEN 'SELECT'
    WHEN cmd = 'a' THEN 'INSERT'
    WHEN cmd = 'w' THEN 'UPDATE'
    WHEN cmd = 'd' THEN 'DELETE'
  END as allowed_operation
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;
