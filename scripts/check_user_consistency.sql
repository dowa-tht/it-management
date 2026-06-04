-- =====================================================
-- User Consistency Check Script
-- ตรวจสอบความสอดคล้องระหว่าง user_profiles และ auth.users
-- =====================================================

-- 1. แสดงจำนวน users ในแต่ละตาราง
SELECT 'user_profiles' as table_name, COUNT(*) as record_count FROM user_profiles
UNION ALL
SELECT 'auth.users' as table_name, COUNT(*) as record_count FROM auth.users;

-- 2. Profile ที่ไม่มีใน auth.users (ตาม ID)
SELECT 
    'PROFILE_MISSING_AUTH' as issue_type,
    up.id,
    up.full_name,
    up.email as profile_email,
    up.role,
    up.is_active,
    up.created_at
FROM user_profiles up
LEFT JOIN auth.users au ON up.id = au.id
WHERE au.id IS NULL;

-- 3. Auth users ที่ไม่มีใน user_profiles
SELECT 
    'AUTH_MISSING_PROFILE' as issue_type,
    au.id,
    au.email as auth_email,
    au.created_at,
    au.last_sign_in_at
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.id
WHERE up.id IS NULL;

-- 4. Email ที่ไม่ตรงกันระหว่างตาราง
SELECT 
    'EMAIL_MISMATCH' as issue_type,
    up.id,
    up.full_name,
    up.email as profile_email,
    au.email as auth_email,
    CASE 
        WHEN up.email IS NULL AND au.email IS NOT NULL THEN 'Profile has no email'
        WHEN up.email IS NOT NULL AND au.email IS NULL THEN 'Auth has no email'
        ELSE 'Emails are different'
    END as mismatch_reason
FROM user_profiles up
INNER JOIN auth.users au ON up.id = au.id
WHERE up.email != au.email 
   OR (up.email IS NULL AND au.email IS NOT NULL)
   OR (up.email IS NOT NULL AND au.email IS NULL);

-- 5. Full_name ที่ซ้ำกันใน user_profiles (สิ่งที่ทำให้ quickAddUser ผิดพลาด)
SELECT 
    'DUPLICATE_NAMES' as issue_type,
    full_name,
    COUNT(*) as duplicate_count,
    STRING_AGG(id::text, ', ') as user_ids
FROM user_profiles
GROUP BY full_name
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC;

-- 6. ตรวจสอบ users ที่มีปัญหาอื่นๆ
-- Users ที่ไม่มี email ใน profile
SELECT 
    'PROFILE_NO_EMAIL' as issue_type,
    id,
    full_name,
    role,
    is_active
FROM user_profiles
WHERE email IS NULL OR email = '';

-- 7. สรุปปัญหาทั้งหมด
WITH profile_missing_auth AS (
    SELECT COUNT(*) as count FROM user_profiles up LEFT JOIN auth.users au ON up.id = au.id WHERE au.id IS NULL
),
auth_missing_profile AS (
    SELECT COUNT(*) as count FROM auth.users au LEFT JOIN user_profiles up ON au.id = up.id WHERE up.id IS NULL
),
email_mismatch AS (
    SELECT COUNT(*) as count FROM user_profiles up INNER JOIN auth.users au ON up.id = au.id 
    WHERE up.email != au.email OR (up.email IS NULL AND au.email IS NOT NULL) OR (up.email IS NOT NULL AND au.email IS NULL)
),
duplicate_names AS (
    SELECT COUNT(*) as count FROM (
        SELECT full_name FROM user_profiles GROUP BY full_name HAVING COUNT(*) > 1
    ) dupes
),
profile_no_email AS (
    SELECT COUNT(*) as count FROM user_profiles WHERE email IS NULL OR email = ''
)
SELECT 
    'SUMMARY' as issue_type,
    (SELECT count FROM profile_missing_auth) as profiles_missing_auth,
    (SELECT count FROM auth_missing_profile) as auth_missing_profile,
    (SELECT count FROM email_mismatch) as email_mismatch,
    (SELECT count FROM duplicate_names) as duplicate_names,
    (SELECT count FROM profile_no_email) as profile_no_email;
