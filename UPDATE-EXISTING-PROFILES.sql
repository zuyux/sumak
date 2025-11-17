-- =================================================================
-- UPDATE EXISTING PROFILES WITH MISSING EMAIL
-- =================================================================
-- This script will check the profiles table structure and update
-- any profiles that are missing email addresses
-- =================================================================

-- STEP 1: Check the profiles table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- STEP 2: Check how many profiles have NULL email
SELECT 
  COUNT(*) as total_profiles,
  COUNT(email) as profiles_with_email,
  COUNT(*) - COUNT(email) as profiles_without_email
FROM profiles;

-- STEP 3: Show profiles with NULL email (to see what needs updating)
SELECT 
  id,
  address,
  username,
  email,
  created_at
FROM profiles
WHERE email IS NULL;

-- =================================================================
-- MANUAL UPDATE REQUIRED:
-- If you see profiles with NULL email, you need to update them
-- manually because we don't have the original email in the database.
-- 
-- Option 1: Update from connected_accounts table (if email exists there)
-- =================================================================

-- STEP 4: Update profiles with email from connected_accounts
UPDATE profiles p
SET email = ca.email
FROM connected_accounts ca
WHERE p.address = ca.address
  AND p.email IS NULL
  AND ca.email IS NOT NULL;

-- STEP 5: Verify the update
SELECT 
  '=== AFTER UPDATE ===' as status,
  COUNT(*) as total_profiles,
  COUNT(email) as profiles_with_email,
  COUNT(*) - COUNT(email) as profiles_without_email
FROM profiles;

-- STEP 6: Show remaining profiles without email (if any)
SELECT 
  id,
  address,
  username,
  email,
  created_at
FROM profiles
WHERE email IS NULL;

-- =================================================================
-- If there are still profiles without email, they need to be
-- updated manually or the user should complete their profile
-- =================================================================
