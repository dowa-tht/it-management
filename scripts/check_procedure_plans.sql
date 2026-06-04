-- Query ตรวจสอบข้อมูล Procedure Plans ที่แสดงใน UI
-- ตรวจสอบว่า plan_name มีข้อมูลถูกต้องหรือไม่

SELECT 
    pp.id as plan_id,
    pp.plan_name,
    pp.steps,
    ctp.template_id,
    ctp.is_default,
    ctp.is_active,
    ct.item_label as template_name
FROM public.checklist_procedure_plans pp
LEFT JOIN public.checklist_template_procedure_plans ctp ON pp.id = ctp.plan_id
LEFT JOIN public.checklist_templates ct ON ctp.template_id = ct.id
WHERE pp.id IN (
    'da946554-ca26-4383-acfd-440608b8fe99',
    'c844aa0c-ad30-4ea6-a35c-012ae3223847',
    '50cce852-1f88-43e7-8fe3-86694adac354'
)
ORDER BY ctp.template_id, ctp.sort_order;

-- ตรวจสอบข้อมูลทั้งหมดใน checklist_procedure_plans
SELECT 
    id,
    plan_name,
    is_active,
    created_at
FROM public.checklist_procedure_plans 
ORDER BY created_at DESC
LIMIT 10;
