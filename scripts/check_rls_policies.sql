-- ตรวจสอบ RLS policies สำหรับ checklist_procedure_plans
-- อาจมีปัญหาจาก migration 20260517_checklist_collaboration.sql

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
WHERE tablename = 'checklist_procedure_plans';

-- ตรวจสอบว่า RLS ถูกเปิดอยู่หรือไม่
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'checklist_procedure_plans';

-- ตรวจสอบ policies ทั้งหมดที่เกี่ยวข้อง
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename IN ('checklist_procedure_plans', 'checklist_templates', 'checklist_template_procedure_plans')
ORDER BY tablename, policyname;
