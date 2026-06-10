# Production Migration Handoff - 10 Jun 2026

## Objective

ส่งต่องานสถานะล่าสุดของ production environment หลัง migration/re-baseline เพื่อให้ agent ถัดไปสามารถตรวจต่อ แก้ต่อ และปิดงาน production hardening ได้โดยไม่ต้องเริ่มไล่ context ใหม่

## Environment Summary

### Development
- Repo: `trush000/dowa-it-system`
- Local workspace: `C:\Users\Lenovo\dowa-it-system`
- Supabase: `fhcsvvlwhwqzlsltrkuq`

### Production
- Repo: `dowa-tht/it-management`
- Supabase: `yrgsukhjkoexvdybyyjm`
- Vercel URL: `https://it-management-dtt.vercel.app/`

## Current Outcome

- Production login ด้วย `admin@dowa-tht.co.th` ใช้งานได้แล้ว
- Permission/menu หลักกลับมาครบและใช้งานหน้า settings หลักได้
- Selected user bootstrap ผ่านแล้วอย่างน้อย 1 admin account
- Master data หลักหลายส่วนถูก seed กลับมาแล้ว
- Workflow / no. series / permission seed phase หลักถูกรันแล้ว
- ปัญหา create user ที่ติด role constraint ถูกคลี่คลายแล้ว
- ปัญหา delete target ที่เคยล้ม ถูกผู้ใช้ยืนยันแล้วว่า "ลบ Target ได้แล้ว"

## Major Findings Already Confirmed

### 1. Role drift between old production data and current runtime

Production เคยมีค่าบทบาทแบบ legacy เช่น `administrator` แต่ runtime ปัจจุบันใช้ค่ามาตรฐานใหม่:

- `admin`
- `it_staff`
- `approver`
- `auditor`
- `employee`

ผลกระทบที่พบจริง:
- account access denied
- create user ไม่ผ่าน
- `user_profiles_role_check` และ `user_registry_user_role_check` ชนกัน

### 2. Production schema drift vs runtime

พบหลายจุดที่ schema บน production ไม่ตรงกับโค้ด runtime ปัจจุบัน โดยจุดที่ตรวจเจอชัดเจนคือ `public.checklist_docs`

Runtime อ้างถึง `checklist_docs.target_id` หลายตำแหน่ง:
- `app/actions/target.js`
- `app/actions/public-checklist.js`
- `app/dashboard/checklist/targets/[targetId]/page.js`

แต่บน production เคยตรวจพบว่า query ด้วย `target_id` ล้มเพราะ column ไม่มีจริง

ผลกระทบที่พบจริง:
- delete target ผ่านหน้าเว็บล้ม
- target history/public checklist history มีความเสี่ยงล้ม
- asset history flow มีความเสี่ยงไม่ครบ

### 3. Invite / onboarding / SSO issues are mostly config-boundary issues

พบแล้วว่าหลายอาการไม่ได้มาจาก business logic โดยตรง แต่เป็นเรื่อง config:

- invite email เคยสร้าง link ไป `localhost`
- Microsoft SSO เคย error `provider is not enabled`
- Azure redirect URI ไม่ตรง production callback
- onboarding PIN เคยล้มเพราะ schema/cache ไม่ครบ

## Evidence Files Most Relevant

### Runtime / Action Layer
- `C:\Users\Lenovo\dowa-it-system\app\actions\target.js`
- `C:\Users\Lenovo\dowa-it-system\app\actions\public-checklist.js`
- `C:\Users\Lenovo\dowa-it-system\app\actions\admin.js`
- `C:\Users\Lenovo\dowa-it-system\app\actions\users.js`
- `C:\Users\Lenovo\dowa-it-system\app\actions\user.js`
- `C:\Users\Lenovo\dowa-it-system\app\actions\workflow.js`

### Schema / Migration Layer
- `C:\Users\Lenovo\dowa-it-system\supabase\migrations\20260505_base_schema_bootstrap.sql`
- `C:\Users\Lenovo\dowa-it-system\supabase\migrations\20260519_fill_missing_tables.sql`
- `C:\Users\Lenovo\dowa-it-system\supabase\migrations\20260525_template_procedure_plan_many_to_many.sql`
- `C:\Users\Lenovo\dowa-it-system\supabase\migrations\20260525_checklist_time_tracking.sql`
- `C:\Users\Lenovo\dowa-it-system\supabase\migrations\20260525_cancel_document_support.sql`
- `C:\Users\Lenovo\dowa-it-system\supabase\migrations\20260526_checklist_doc_evaluation.sql`

### Standards / Planning Docs
- `C:\Users\Lenovo\dowa-it-system\docs\INDEX.md`
- `C:\Users\Lenovo\dowa-it-system\AGENTS.md`
- `C:\Users\Lenovo\dowa-it-system\docs\standards\TARGET_REGISTRY.md`
- `C:\Users\Lenovo\dowa-it-system\docs\manuals\PRODUCTION_REBASELINE_EXECUTION_RUNBOOK.md`
- `C:\Users\Lenovo\dowa-it-system\docs\manuals\PRODUCTION_REBASELINE_SCHEMA_VERIFICATION_CHECKLIST.md`
- `C:\Users\Lenovo\dowa-it-system\docs\manuals\PRODUCTION_REBASELINE_VERIFICATION_SQL_PACK.md`

## Local Code Changes Already Present In Dev Workspace

ไฟล์ต่อไปนี้ถูกปรับใน dev workspace เพื่อรองรับ email/public URL behavior:

- `C:\Users\Lenovo\dowa-it-system\lib\publicBaseUrl.js`
- `C:\Users\Lenovo\dowa-it-system\lib\emailTemplates.js`
- `C:\Users\Lenovo\dowa-it-system\lib\resend.js`
- `C:\Users\Lenovo\dowa-it-system\app\actions\admin.js`
- `C:\Users\Lenovo\dowa-it-system\app\actions\users.js`
- `C:\Users\Lenovo\dowa-it-system\app\actions\user.js`
- `C:\Users\Lenovo\dowa-it-system\app\actions\recovery.js`
- `C:\Users\Lenovo\dowa-it-system\app\actions\workflow.js`
- `C:\Users\Lenovo\dowa-it-system\app\api\approval\send\route.js`

หมายเหตุ:
- การเปลี่ยนแปลงชุดนี้อยู่ใน dev workspace ไม่ได้หมายความว่า production repo/apply แล้วทั้งหมด
- agent ถัดไปควรตรวจ diff และตัดสินใจ promote อย่างมี scope

## User-Confirmed Resolved Items

- login เข้า production ได้
- menu permissions กลับมาครบ
- create user กลับมาทำงานได้
- delete target กลับมาทำงานได้

## Remaining Work

### A. Production Schema Verification

ต้องตรวจ column-by-column บน production เทียบ runtime usage จริงสำหรับตารางอย่างน้อย:

- `public.checklist_docs`
- `public.checklist_items`
- `public.user_profiles`
- `public.user_registry`
- `public.workflow_configs`
- `public.permission_sets`
- `public.checklist_templates`
- `public.checklist_targets`
- `public.checklist_template_targets`

Expected output:
- `table`
- `missing_column`
- `wrong_type`
- `runtime_reference`
- `impact`
- `recommended_sql_patch`

### B. Checklist Document Backfill Audit

แม้ตอนนี้ delete target ใช้งานได้แล้ว แต่ยังต้องยืนยันว่า `checklist_docs` มี field runtime-critical ครบ เช่น:

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

และต้องเช็กว่าข้อมูลเก่าต้อง backfill หรือไม่

### C. Onboarding / Invite / Email Verification

ต้องทดสอบจริงบน production:
- create user
- send invite
- email link เปิดไป production URL จริง
- user set password / PIN ได้
- onboarding complete ได้

### D. Microsoft SSO Production Configuration

ต้องยืนยัน:
- Supabase Azure provider ถูก enable บน production
- Azure App Registration มี redirect URI ของ production callback
- Vercel env ฝั่ง production ชี้ค่า Microsoft/Supabase ถูกชุด

### E. Production Data Completeness Audit

ต้องตรวจว่า master/baseline data มา “ครบตาม business use” หรือยัง:

- incident category
- affected system
- SLA exclusion reason
- checklist category
- checklist templates
- checklist procedure plans
- template-target mappings
- target registry baseline
- workflow configs
- no series / no series lines
- holidays
- working hours

### F. Final Production Runbook Closure

จัดทำหรืออัปเดต final execution notes ให้ปิดงานได้:
- applied SQL list
- manual steps already done
- open issues
- rollback caveats
- post-migration smoke test result

## Recommended Next Step For Next Agent

1. เข้า `Migration Planning Mode`
2. อ่าน `AGENTS.md` และ `docs/INDEX.md`
3. เริ่มจาก `production schema verification` อย่างเดียว
4. สรุป gap ออกมาเป็นตาราง `table / issue / evidence / SQL remedy`
5. หลัง schema stable ค่อยไป `onboarding + SSO + email` end-to-end verification

## Suggested Operator Queries To Reuse

### Check checklist_docs columns

```sql
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'checklist_docs'
order by ordinal_position;
```

### Check target dependencies

```sql
select count(*) as template_mapping_count
from public.checklist_template_targets
where target_id = 'PUT_TARGET_ID_HERE';
```

### Check user role distribution

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

## Handoff Notes

- งานรอบนี้มีหลายจุดที่แก้ผ่าน SQL/manual config บน production โดยตรง
- agent ถัดไปไม่ควร assume ว่า production state ตรงกับ repo migrations 100%
- ให้เชื่อผลตรวจจาก production database/schema จริงเป็นหลัก
- ถ้าจะ promote code เพิ่ม ต้องแยกจากงาน schema verification ให้ชัด
