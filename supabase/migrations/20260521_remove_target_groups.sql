-- Migration: Remove Target Groups & Transition to per_type Mapping
-- Date: 2026-05-21

-- 1. ย้ายประเภทอุปกรณ์ (target_type) เดิมที่อยู่ในระบบไปเก็บใน master_data (ถ้าไม่มีอยู่ก่อน)
INSERT INTO public.master_data (type, value, sort_order, is_active)
SELECT DISTINCT 'target_type', target_type, 0, true
FROM public.checklist_targets
WHERE target_type IS NOT NULL AND target_type != ''
AND NOT EXISTS (
  SELECT 1 FROM public.master_data WHERE type = 'target_type' AND value = target_type
)
ON CONFLICT (type, value) DO NOTHING;

-- 2. ย้ายค่า default target types เพิ่มเติม (cctv_terminal_box, ups, nvr, switch)
INSERT INTO public.master_data (type, value, sort_order, is_active)
VALUES 
  ('target_type', 'cctv_terminal_box', 1, true),
  ('target_type', 'ups', 2, true),
  ('target_type', 'nvr', 3, true),
  ('target_type', 'switch', 4, true)
ON CONFLICT (type, value) DO NOTHING;

-- 3. อัปเดต checklist_templates และ checklist_procedure_plans ที่เป็น per_group ให้เป็น per_type
UPDATE public.checklist_templates
SET scope_mode = 'per_type'
WHERE scope_mode = 'per_group';

UPDATE public.checklist_procedure_plans
SET scope_mode = 'per_type'
WHERE scope_mode = 'per_group';

-- 4. ลบ Foreign Key constraints เดิมบน target_group_id
ALTER TABLE IF EXISTS public.checklist_targets 
  DROP CONSTRAINT IF EXISTS checklist_targets_target_group_id_fkey;

ALTER TABLE IF EXISTS public.checklist_template_targets 
  DROP CONSTRAINT IF EXISTS checklist_template_targets_target_group_id_fkey;

-- 5. ลบ Column target_group_id ออก
ALTER TABLE IF EXISTS public.checklist_targets 
  DROP COLUMN IF EXISTS target_group_id;

ALTER TABLE IF EXISTS public.checklist_template_targets 
  DROP COLUMN IF EXISTS target_group_id;

-- 6. ลบตาราง checklist_target_groups ออกถาวร
DROP TABLE IF EXISTS public.checklist_target_groups CASCADE;
