-- =====================================================
-- Cleanup Incomplete Users Script
-- ลบ users ที่ไม่สมบูรณ์ (มีใน auth.users แต่ไม่มีใน user_profiles)
-- =====================================================

-- ตรวจสอบก่อนลบ
SELECT 
    au.id,
    au.email as auth_email,
    au.created_at,
    au.last_sign_in_at
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.id
WHERE up.id IS NULL;

-- ลบ users ที่ไม่มี profile
-- รันคำสั่งนี้หลังจากตรวจสอบแล้วว่าถูกต้อง
DELETE FROM auth.users 
WHERE id IN (
    SELECT au.id
    FROM auth.users au
    LEFT JOIN user_profiles up ON au.id = up.id
    WHERE up.id IS NULL
);

-- ตรวจสอบผลลัพธ์หลังลบ
SELECT 
    'AFTER_CLEANUP' as status,
    (SELECT COUNT(*) FROM auth.users) as auth_users_count,
    (SELECT COUNT(*) FROM user_profiles) as user_profiles_count,
    (SELECT COUNT(*) FROM auth.users au LEFT JOIN user_profiles up ON au.id = up.id WHERE up.id IS NULL) as missing_profile_count;
