-- ============================================================
-- CHECKPOINT: Pre-RBAC Schema Backup
-- Date: 2026-04-29 | Tag: v1.0-pre-rbac
-- 
-- วิธีใช้: รัน Script นี้ใน Supabase SQL Editor เพื่อดู
-- โครงสร้างตารางที่มีอยู่ก่อนการ Migration
-- ============================================================

-- ดูรายชื่อตารางทั้งหมดในระบบ
SELECT 
  table_name,
  pg_size_pretty(pg_total_relation_size(quote_ident(table_name)::text)) AS size
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- ============================================================
-- โครงสร้างที่รู้จักก่อน RBAC (เก็บไว้เป็น Reference)
-- ============================================================

-- user_profiles (ตารางหลักที่จะถูก ALTER)
-- Columns ที่มีอยู่:
--   id, full_name, role, is_active, can_be_assignee
--   (role values: 'superuser', 'user', 'visitor')

-- incidents
-- Columns ที่มีอยู่:
--   id, case_number, title, severity, status, created_at
--   acknowledged_at, assigned_at, assigned_to, resolved_at
--   resolved_by, reported_by, affected_system, category
--   description, root_cause, resolution, corrective_action
--   require_ca, is_locked, ref_type, ref_id
--   signature_it, signature_reporter, signature_manager

-- incident_logs
--   id, incident_id, action, from_status, to_status, note
--   user_email, created_at

-- incident_exclusions
--   id, incident_id, reason_id, start_time, end_time
--   notes, created_by

-- backup_logs
--   id, log_date, system_name, status, notes

-- checklist_docs
--   id, freq_type, period_date, status, notes

-- checklist_items
--   id, doc_id, item_name, status, notes

-- checklist_logs
--   id, doc_id, action, user_email, created_at

-- holidays
--   id, holiday_date, description

-- master_data
--   id, type, value, sort_order, is_active

-- system_settings
--   id, key, value (JSONB)

-- ============================================================
-- ROLLBACK SCRIPT (รันเมื่อต้องการย้อนกลับ)
-- ============================================================
-- ถ้า RBAC Migration ผิดพลาด ให้รัน Script ต่อไปนี้:

/*
-- Step 1: ลบ Columns ที่เพิ่มใหม่ใน user_profiles
ALTER TABLE public.user_profiles
  DROP COLUMN IF EXISTS pin_hash,
  DROP COLUMN IF EXISTS pin_reset_token,
  DROP COLUMN IF EXISTS pin_reset_expires,
  DROP COLUMN IF EXISTS department,
  DROP COLUMN IF EXISTS employee_id;

-- Step 2: ลบตารางใหม่ที่สร้างขึ้น (ถ้ามี)
DROP TABLE IF EXISTS public.external_users CASCADE;
DROP TABLE IF EXISTS public.approval_tokens CASCADE;
DROP TABLE IF EXISTS public.user_registry CASCADE;
DROP TABLE IF EXISTS public.user_limits CASCADE;

-- Step 3: ยืนยันว่าข้อมูลเดิมยังอยู่
SELECT COUNT(*) as user_count FROM public.user_profiles;
SELECT COUNT(*) as incident_count FROM public.incidents;
*/
