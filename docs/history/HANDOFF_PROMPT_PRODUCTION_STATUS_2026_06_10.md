# Handoff Prompt - Production Status Continuation (10 Jun 2026)

ใช้ข้อความด้านล่างเป็น prompt ตั้งต้นสำหรับ agent ตัวถัดไปได้ทันที

---

คุณกำลังรับช่วงงาน production hardening / post-migration verification ของระบบ DOWA IT

## 1. Working Mode

ให้เริ่มใน `Migration Planning Mode` ก่อนเสมอ  
ห้ามแก้โปรแกรมทันที  
ให้ตรวจ production state จริงก่อน โดยเชื่อ database/config/runtime evidence เป็นหลัก

## 2. Environment

### Development Source
- Repo: `trush000/dowa-it-system`
- Workspace: `C:\Users\Lenovo\dowa-it-system`
- Supabase: `fhcsvvlwhwqzlsltrkuq`

### Production Target
- Repo: `dowa-tht/it-management`
- Supabase: `yrgsukhjkoexvdybyyjm`
- Vercel URL: `https://it-management-dtt.vercel.app/`

## 3. Current Confirmed Status

- production login ใช้งานได้แล้ว
- admin account ใช้งานได้แล้ว
- permissions/menu หลักกลับมาครบแล้ว
- create user ใช้งานได้แล้ว
- delete target ใช้งานได้แล้ว
- หลายปัญหาก่อนหน้านี้เกิดจาก schema drift + config drift ไม่ใช่ business logic ล้วน

## 4. Key Findings Already Confirmed

### Role Drift
production เคยมี role legacy เช่น `administrator` แต่ runtime ปัจจุบันใช้:
- `admin`
- `it_staff`
- `approver`
- `auditor`
- `employee`

### Schema Drift
production schema ไม่ตรง runtime หลายจุด โดยเฉพาะ `public.checklist_docs`

runtime อ้างถึง:
- `checklist_docs.target_id`
- `checklist_docs.template_id`
- และ field runtime-critical อื่นอีกหลายตัว

### Config Drift
ปัญหาบางส่วนเป็นเรื่อง config:
- invite email เคยลิงก์ไป `localhost`
- Microsoft SSO เคยไม่ enable provider
- Azure redirect URI ไม่ตรง production callback

## 5. Documents To Read First

อ่านตามลำดับนี้:

1. `C:\Users\Lenovo\dowa-it-system\AGENTS.md`
2. `C:\Users\Lenovo\dowa-it-system\docs\INDEX.md`
3. `C:\Users\Lenovo\dowa-it-system\docs\history\HANDOFF_PRODUCTION_STATUS_2026_06_10.md`
4. `C:\Users\Lenovo\dowa-it-system\docs\manuals\PRODUCTION_REBASELINE_SCHEMA_VERIFICATION_CHECKLIST.md`
5. `C:\Users\Lenovo\dowa-it-system\docs\manuals\PRODUCTION_REBASELINE_VERIFICATION_SQL_PACK.md`
6. `C:\Users\Lenovo\dowa-it-system\docs\standards\TARGET_REGISTRY.md`

## 6. Files Most Relevant For Runtime Evidence

- `C:\Users\Lenovo\dowa-it-system\app\actions\target.js`
- `C:\Users\Lenovo\dowa-it-system\app\actions\public-checklist.js`
- `C:\Users\Lenovo\dowa-it-system\app\actions\admin.js`
- `C:\Users\Lenovo\dowa-it-system\app\actions\users.js`
- `C:\Users\Lenovo\dowa-it-system\app\actions\user.js`
- `C:\Users\Lenovo\dowa-it-system\app\actions\workflow.js`
- `C:\Users\Lenovo\dowa-it-system\supabase\migrations\20260505_base_schema_bootstrap.sql`
- `C:\Users\Lenovo\dowa-it-system\supabase\migrations\20260519_fill_missing_tables.sql`
- `C:\Users\Lenovo\dowa-it-system\supabase\migrations\20260525_template_procedure_plan_many_to_many.sql`
- `C:\Users\Lenovo\dowa-it-system\supabase\migrations\20260525_checklist_time_tracking.sql`
- `C:\Users\Lenovo\dowa-it-system\supabase\migrations\20260525_cancel_document_support.sql`
- `C:\Users\Lenovo\dowa-it-system\supabase\migrations\20260526_checklist_doc_evaluation.sql`

## 7. Primary Objective For This Continuation

ทำ `production schema verification` ให้ครบก่อนเป็นงานแรก  
ห้ามข้ามไปแก้ flow อื่นจนกว่าจะรู้ว่า production schema ตรงกับ runtime หรือยัง

## 8. Required Output Format

ให้สรุปผลเป็นตารางนี้:

- `table`
- `issue_type`
- `missing_or_mismatched_field`
- `runtime_evidence`
- `impact`
- `sql_patch_needed`

## 9. Tasks To Continue

### Task A: Production Schema Verification

ตรวจอย่างน้อย:
- `public.checklist_docs`
- `public.checklist_items`
- `public.user_profiles`
- `public.user_registry`
- `public.workflow_configs`
- `public.permission_sets`
- `public.checklist_templates`
- `public.checklist_targets`
- `public.checklist_template_targets`

### Task B: Checklist Docs Backfill Audit

ยืนยัน field runtime-critical ของ `checklist_docs`:
- `target_id`
- `template_id`
- `doc_no`
- `freq_type`
- `period_date`
- `checked_at`
- `created_by`
- `created_by_id`
- `selected_plan_id`
- `start_time`
- `actual_end_time`
- `total_duration_minutes`
- `calculated_end_time`
- `evaluation_result`
- `evaluation_remark`
- `cancelled_at`
- `cancelled_by`
- `cancel_reason`

### Task C: Production Invite / Onboarding Verification

หลัง schema stable แล้ว ตรวจ:
- create user
- invite email
- onboarding link
- set password / PIN
- onboarding completion

### Task D: Microsoft SSO Verification

ตรวจ:
- Supabase provider enabled
- Azure redirect URI ถูกต้อง
- Vercel env ถูกชุด

### Task E: Data Completeness Audit

ตรวจความครบของ:
- incident category
- affected system
- SLA exclusion reason
- checklist category
- checklist templates
- checklist procedure plans
- target mappings
- workflow configs
- no series
- holidays
- working hours

## 10. SQL Starters

### Checklist Docs Columns

```sql
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'checklist_docs'
order by ordinal_position;
```

### User Role Distribution

```sql
select 'user_profiles' as source, role as role_value, count(*)::int as row_count
from public.user_profiles
group by role

union all

select 'user_registry' as source, user_role as role_value, count(*)::int as row_count
from public.user_registry
group by user_role
order by source, role_value;
```

### Target Mapping Count

```sql
select count(*) as template_mapping_count
from public.checklist_template_targets
where target_id = 'PUT_TARGET_ID_HERE';
```

## 11. Important Guardrails

- อย่า assume ว่า production state ตรงกับ repo migration files
- อย่าแก้โปรแกรมก่อน ถ้ายังไม่ปิด schema drift
- ถ้าจะแก้ production ให้เน้น SQL patch ที่มีหลักฐานจาก runtime
- ถ้าพบปัญหาใหม่ ให้สรุปเป็น evidence-first ไม่เดา

## 12. Completion Condition

ถือว่างานรอบนี้จบได้เมื่อ:
- มี production schema gap report ชัดเจน
- มี SQL patch list ที่จำเป็น
- มี verification result หลัง patch
- พร้อมส่งต่อ phase onboarding / SSO / data completeness ต่อ

---

หากต้องเริ่มทันที ให้เริ่มจาก:

1. อ่าน `HANDOFF_PRODUCTION_STATUS_2026_06_10.md`
2. ตรวจ `checklist_docs` schema บน production
3. สรุปช่องว่างพร้อม SQL patch ที่ต้องใช้
