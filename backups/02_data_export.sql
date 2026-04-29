-- ============================================================
-- CHECKPOINT: Pre-RBAC Data Export Script
-- Date: 2026-04-29 | Tag: v1.0-pre-rbac
--
-- วิธีใช้:
-- 1. ไปที่ Supabase Dashboard → SQL Editor
-- 2. รันแต่ละ Query ด้านล่างทีละอัน
-- 3. Download ผลลัพธ์เป็น CSV โดยกด "Download CSV" 
--    ที่มุมขวาล่างของผลลัพธ์แต่ละชุด
-- 4. เก็บไฟล์ CSV ไว้ในโฟลเดอร์ backups/data/
-- ============================================================

-- [1] ข้อมูลผู้ใช้ (สำคัญที่สุด)
SELECT 
  id, full_name, role, is_active, can_be_assignee,
  created_at
FROM public.user_profiles
ORDER BY created_at;

-- [2] ระบบการตั้งค่า
SELECT key, value::text AS value_text
FROM public.system_settings
ORDER BY key;

-- [3] Incidents ทั้งหมด
SELECT 
  id, case_number, title, severity, status,
  created_at, acknowledged_at, assigned_at, assigned_to,
  resolved_at, resolved_by, reported_by, affected_system,
  category, description, root_cause, resolution,
  corrective_action, require_ca, is_locked, ref_type, ref_id
FROM public.incidents
ORDER BY created_at;

-- [4] Master Data
SELECT id, type, value, sort_order, is_active
FROM public.master_data
ORDER BY type, sort_order;

-- [5] Holidays
SELECT id, holiday_date, description
FROM public.holidays
ORDER BY holiday_date;

-- [6] นับจำนวนข้อมูลทั้งหมด (Summary)
SELECT 'user_profiles'     AS table_name, COUNT(*) AS row_count FROM public.user_profiles
UNION ALL
SELECT 'incidents',                         COUNT(*) FROM public.incidents
UNION ALL
SELECT 'incident_logs',                     COUNT(*) FROM public.incident_logs
UNION ALL
SELECT 'incident_exclusions',               COUNT(*) FROM public.incident_exclusions
UNION ALL
SELECT 'backup_logs',                       COUNT(*) FROM public.backup_logs
UNION ALL
SELECT 'checklist_docs',                    COUNT(*) FROM public.checklist_docs
UNION ALL
SELECT 'checklist_items',                   COUNT(*) FROM public.checklist_items
UNION ALL
SELECT 'master_data',                       COUNT(*) FROM public.master_data
UNION ALL
SELECT 'system_settings',                   COUNT(*) FROM public.system_settings
ORDER BY table_name;
