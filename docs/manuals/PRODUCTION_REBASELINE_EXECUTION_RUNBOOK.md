# Production Re-baseline Execution Runbook

เอกสารนี้เป็น `Execution Runbook` สำหรับการทำ `Production Re-baseline Migration` ครั้งแรกของระบบ DOWA IT System โดยยึดตาม scope ที่อนุมัติไว้แล้วในเอกสาร migration planning

> [!IMPORTANT]
> เอกสารนี้เป็น runbook สำหรับ `Production Migration Mode` เท่านั้น  
> ในสถานะปัจจุบันยังถือว่าเป็นเอกสาร planning และห้ามนำไป execute กับ production โดยตรงจนกว่าจะ:
> 1. USER เลือก `Production Migration Mode`
> 2. ปิดรายการ `must-verify` ครบ
> 3. มี backup/rollback checkpoint พร้อม

---

## 1. Objective

ตั้ง production ใหม่ให้ตรงกับ development baseline ปัจจุบัน โดย:
- reset `production repo`
- reset `production database`
- apply schema chain ทั้งหมดจาก `supabase/migrations/`
- seed เฉพาะ `green scope baseline data`
- create/migrate selected users เฉพาะ:
  - `admin@dowa-tht.co.th`
  - `natthawut@dowa-tht.co.th`
- ไม่ย้าย transaction data
- ไม่ย้าย audit/log history
- reset PIN / onboarding / recovery / OTP state

---

## 2. Fixed Environment Targets

### Development Source
- Repo: `trush000/dowa-it-system`
- Local path: `C:\Users\Lenovo\dowa-it-system`
- Supabase: `fhcsvvlwhwqzlsltrkuq`

### Production Target
- Repo: `dowa-tht/it-management`
- Supabase: `yrgsukhjkoexvdybyyjm`

---

## 3. Entry Gate

ต้องผ่านครบทุกข้อก่อนเริ่ม execute จริง:

1. USER พิมพ์ยืนยันเข้าสู่ `Production Migration Mode`
2. มี release tag หรือ commit SHA ต้นทางที่ชัดเจน
3. backup production DB พร้อม restore point
4. backup production repo / deployment reference พร้อม rollback point
5. ปิด `must-verify` ครบ
6. มี final extraction plan สำหรับ master data และ selected users

---

## 4. Must-Verify Before Execution

1. `workflow_configs` live schema มี `condition_key` หรือไม่
2. `checklist_targets` หลัง `remove_target_groups` ตรงกับ runtime schema จริงหรือไม่
3. `checklist_templates` และ `checklist_procedure_plans` มี field เสริมจาก migration ภายหลังหรือไม่
4. `no_series` มี field เสริมที่ runtime helper ใช้จริงหรือไม่
5. selected users 2 รายการมี `role`, `can_be_assignee`, และสถานะ active ตรงตามที่ต้องการใน dev
6. `workflow_configs.approver_id` หรือ `approval_substitutes` อ้างถึง user นอก scope หรือไม่
7. `master_data.checklist_category` และ `master_data.target_type` ครอบคลุมค่าที่ baseline runtime data ใช้อยู่จริงหรือไม่
8. `checklist_template_targets` rows แบบ `per_type` ถูกตีความถูกต้องหรือไม่ (`target_id = null` ใช้ได้เมื่อ `target_type` มีค่า)

สถานะล่าสุดตาม audit `08-Jun-2026`:
- `approval_substitutes` schema drift ปิดแล้วและใช้ runtime columns ชุด `substitute_id`, `start_date`, `end_date`, `reason`
- target-group drift ปิดแล้ว
- selected-user reference check ผ่านแล้ว

หากข้อใดยังไม่ชัด ให้หยุดที่ `Migration Planning Mode`

---

## 5. Source Artifacts

### Required Docs
- `docs/manuals/PRODUCTION_MIGRATION_PLAYBOOK.md`
- `docs/manuals/PRODUCTION_MIGRATION_SOP.md`
- `docs/manuals/PRODUCTION_REBASELINE_FINAL_IN_SCOPE_TABLE_LIST.md`
- `docs/manuals/RELEASE_AND_ROLLBACK_CHECKLIST.md`

### Required Paths
- `supabase/migrations/`
- `app/`
- `components/`
- `lib/`
- `scripts/`
- `tests/`

---

## 6. Runbook Phases

## Phase A — Freeze and Checkpoint

### A1. Freeze release scope
- ล็อก commit SHA จาก development source
- ล็อก migration file list ที่จะใช้
- ล็อก selected users 2 รายการ
- ล็อก baseline tables ตาม final in-scope table list

### A2. Record checkpoint
- บันทึก:
  - release name
  - release tag
  - source commit SHA
  - migration file list
  - extraction timestamp

### A3. Backup production
- backup production DB ทั้ง schema + data
- backup production deployment reference
- backup production repo state หรือ tag ปัจจุบัน

### A4. Stop condition
ถ้า backup ไม่ครบหรือ rollback point ยังไม่ชัด:
- ห้ามไป Phase B

---

## Phase B — Development Extraction

## B1. Extract baseline config data

ตาราง:
- `system_settings`
- `master_data`
- `holidays`
- `permission_sets`

หลักการ:
- extract เฉพาะ fields ที่อยู่ใน `Final In-Scope Table List`
- `system_settings` ให้ filter เฉพาะ baseline keys ที่อนุมัติแล้ว
- ห้ามดูดทั้งตารางแบบ raw ถ้ามี key นอก scope ปะปน
- ถ้า `master_data` source ยังขาด runtime-referenced rows ให้แนบ `master_data_supplement.sql` / `master_data_supplement.json` ใน artifact pack และถือเป็นส่วนหนึ่งของ baseline config seed

## B2. Extract checklist baseline

ตาราง:
- `checklist_procedure_plans`
- `checklist_templates`
- `checklist_targets`
- `checklist_template_targets`
- `checklist_template_procedure_plans`

หลักการ:
- maintain logical order ของ parent-child mapping
- verify referential integrity ก่อน export:
  - mappings ทุก row ต้องมี parent อยู่จริง
  - ถ้า `target_id = null` ต้องมี `target_type`
  - `target_type` และ `category` ที่ถูกอ้างต้องอยู่ใน exported `master_data`

## B3. Extract workflow baseline

ตาราง:
- `workflow_configs`
- `approval_substitutes`

หลักการ:
- ตรวจว่า `approver_id` ทุกตัวอยู่ใน selected users หรือเป็น user ที่ต้องมีใน production จริง
- ถ้ามี approver reference อยู่นอก scope ต้องตัดสินใจก่อน execute

## B4. Extract numbering baseline

ตาราง:
- `no_series`
- `no_series_lines`

หลักการ:
- ต้องมี parent `no_series` ครบก่อน line rows

## B5. Extract selected users

ตาราง:
- `auth.users`
- `user_profiles`
- `user_whitelist`

scope:
- `admin@dowa-tht.co.th`
- `natthawut@dowa-tht.co.th`

carry-forward:
- keep: `email`, `full_name`, `role`, `is_active`, `can_be_assignee`, `expires_at`, `email_hash`
- reset:
  - `signature_pin`
  - `otp_*`
  - `is_onboarded`
  - `onboarding_*`
  - `force_password_change`
  - `recovery_*`
  - `pin_reset_*`

---

## Phase C — Production Reset

## C1. Reset production repo
- sync production codebase ให้ตรงกับ approved release จาก development source
- ห้าม cherry-pick แบบคละชุดสำหรับรอบแรก

## C2. Reset production DB
- reset production DB ให้กลับสู่ clean state
- ต้องทำหลัง backup แล้วเท่านั้น

### Stop condition
ถ้า production reset สำเร็จไม่ครบ:
- ห้าม apply seed ต่อ

---

## Phase D — Schema Apply

รัน migration chain ทั้งหมดใน `supabase/migrations/` ตามลำดับ timestamp:

1. `20260505_base_schema_bootstrap.sql`
2. `20260506_add_member_role.sql`
3. `20260506_user_management_upgrade.sql`
4. `20260507_add_onboarding_expiry.sql`
5. `20260507_add_recovery_columns.sql`
6. `20260508_admin_audit_logs.sql`
7. `20260508_workflow_refinement_phase_2.sql`
8. `20260510_add_assigned_to_id_to_incidents.sql`
9. `20260512_fix_document_approvals_verified_by_pin.sql`
10. `20260517_checklist_collaboration.sql`
11. `20260519_add_approver_id_to_workflow_configs.sql`
12. `20260519_fill_missing_tables.sql`
13. `20260521_remove_target_groups.sql`
14. `20260523_fix_stuck_daily_approvals.sql`
15. `20260523_reporter_email_otp.sql`
16. `20260525_cancel_document_support.sql`
17. `20260525_checklist_item_steps.sql`
18. `20260525_checklist_time_tracking.sql`
19. `20260525_template_procedure_plan_many_to_many.sql`
20. `20260526_checklist_doc_evaluation.sql`
21. `20260529_fix_incident_reporter_approver_mapping.sql`
22. `20260529_incident_followup_tokens.sql`
23. `20260605_checklist_auditor_readonly_rls.sql`
24. `20260606_fix_auditor_readonly_rls_leaks.sql`
25. `20260608_align_substitute_and_target_group_schema_to_runtime.sql`
26. `20260608_enable_rls_for_substitutes_and_lock_legacy_sla_tables.sql`
27. `add_rls_policies.sql`

### Stop condition
ถ้ามี migration fail:
- หยุดทันที
- ห้าม seed data ต่อ
- ใช้ rollback/checkpoint policy

---

## Phase E — Baseline Seed Apply

ใช้ลำดับนี้เท่านั้น:

1. `system_settings`
2. `master_data`
3. `holidays`
4. `permission_sets`
5. `checklist_procedure_plans`
6. `checklist_templates`
7. `checklist_targets`
8. `checklist_template_targets`
9. `checklist_template_procedure_plans`
10. `auth.users`
11. `user_profiles`
12. `user_whitelist`
13. `workflow_configs`
14. `approval_substitutes`
15. `no_series`
16. `no_series_lines`

### Rules
- parent tables ก่อน child mappings เสมอ
- ใช้เฉพาะ fields ที่อนุมัติใน final in-scope list
- ห้าม seed transaction rows
- ห้าม seed audit/log history

---

## Phase F — Selected User Validation and Reference Check

## F1. Validate selected users after seed
- ยืนยันว่า `auth.users` ถูกสร้างครบ:
  - `admin@dowa-tht.co.th`
  - `natthawut@dowa-tht.co.th`
- เก็บ mapping:
  - `email -> auth user id`

## F2. Validate `user_profiles`
- ยืนยันว่า field สำคัญถูก seed ถูกต้อง:
  - `id`
  - `email`
  - `full_name`
  - `role`
  - `is_active`
  - `can_be_assignee`
  - `expires_at` เมื่อจำเป็น
- ยืนยันว่า sensitive state ถูก reset:
  - `signature_pin`
  - `otp_*`
  - `is_onboarded`
  - `onboarding_*`
  - `recovery_*`
  - `pin_reset_*`

## F3. Validate `user_whitelist` and downstream references
- ยืนยันว่า `user_whitelist` มี hash เฉพาะ 2 email ที่อยู่ใน scope
- ยืนยันว่า `workflow_configs.approver_id` remap แล้ว
- ยืนยันว่า `approval_substitutes.primary_approver_id` และ `substitute_id` remap แล้ว

### Stop condition
ถ้า 2 user seed/validation ไม่สมบูรณ์:
- ห้ามเปิดให้ใช้งานจริง

---

## Phase G — Verification

## G1. Schema verification
- verify ตารางสำคัญมีครบ
- verify columns สำคัญตรงตาม runtime
- verify RLS/policies สำคัญยังอยู่ครบ

## G2. Data verification
- verify row counts ของ baseline tables
- verify mappings ไม่ orphan
- verify selected users 2 คนมี role ถูกต้อง

## G3. Functional smoke test
- login ด้วย selected users
- dashboard load
- settings pages load:
  - working hours
  - holidays
  - workflow
  - permissions
  - no series
  - substitutes
- checklist master / target registry load
- approval view load

## G4. Security sanity
- `auditor` policies ยัง read-only ตาม intended schema
- ไม่มี broad policy เกิน scope บนตารางสำคัญ
- ไม่มี service-role leak ฝั่ง client/deployment config

---

## 7. Rollback Triggers

ต้อง rollback ทันทีเมื่อเกิดข้อใดข้อหนึ่ง:

1. migration chain fail กลางทางและ recover ไม่ได้ทันที
2. selected users login ไม่ได้ทั้งคู่
3. workflow baseline ใช้งานไม่ได้
4. critical settings pages เปิดไม่ได้
5. RLS/policy mismatch กระทบ security boundary
6. data mapping หลักของ checklist baseline แตก

---

## 8. Rollback Path

### Layer 1 — Code
- revert production repo ไป checkpoint ก่อนเริ่ม
- redeploy production code

### Layer 2 — Database
- restore production DB จาก backup snapshot ก่อน migration

### Layer 3 — Validation
- verify login
- verify core routes
- verify production state กลับสู่ก่อนเริ่มงาน

---

## 9. Deliverables From This Runbook

ก่อน execute จริง ควรมี artifact ต่อไปนี้ครบ:

1. release inventory
2. migration file list
3. baseline export plan
4. selected user export plan
5. production backup reference
6. rollback reference
7. post-migration verification checklist

---

## 10. Next Planning Step

ก่อนใช้ runbook นี้จริง แนะนำให้ทำต่ออีก 2 ชิ้น:

1. `Schema Verification Checklist`
   - query-level checklist สำหรับปิด must-verify items
2. `Seed Extraction Mapping`
   - ระบุว่าข้อมูลแต่ละตารางจะ extract/export/import ด้วยวิธีใด

---

## Related Documents

- `docs/manuals/PRODUCTION_MIGRATION_PLAYBOOK.md`
- `docs/manuals/PRODUCTION_MIGRATION_SOP.md`
- `docs/manuals/PRODUCTION_REBASELINE_FINAL_IN_SCOPE_TABLE_LIST.md`
- `docs/manuals/RELEASE_AND_ROLLBACK_CHECKLIST.md`
- `docs/standards/DEV_PROD_OPERATING_POLICY.md`
- `docs/standards/MIGRATION_COMMAND_CONTRACT.md`
