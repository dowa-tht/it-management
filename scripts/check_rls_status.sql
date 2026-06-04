-- ตรวจสอบว่า RLS เปิดอยู่หรือไม่
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'checklist_procedure_plans';

-- ทดสอบ query ตรงๆ กับ checklist_procedure_plans
SELECT 
    id,
    plan_name,
    'TEST_QUERY' as test_flag
FROM public.checklist_procedure_plans 
LIMIT 3;

-- ตรวจสอปัญหา is_active column (อาจไม่มีในตารางนี้)
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'checklist_procedure_plans'
ORDER BY ordinal_position;
