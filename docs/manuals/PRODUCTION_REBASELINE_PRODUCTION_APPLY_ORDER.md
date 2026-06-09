# Production Re-baseline Production Apply Order

เอกสารนี้เป็น `operator order` สำหรับการย้าย baseline รอบแรกขึ้น production โดยดึงเฉพาะลำดับลงมือทำที่จำเป็นจาก runbook ให้อ่านง่ายและใช้เป็นต้นฉบับสำหรับคำสั่งในอนาคต

> [!IMPORTANT]
> เอกสารนี้ยังอยู่ใน `Migration Planning Mode`
>
> ห้าม execute กับ production repo `dowa-tht/it-management` หรือ production Supabase `yrgsukhjkoexvdybyyjm` จนกว่า USER จะยืนยันเข้าสู่ `Production Migration Mode`

---

## 1. Fixed Targets

### Development Source
- Repo: `trush000/dowa-it-system`
- Local path: `C:\Users\Lenovo\dowa-it-system`
- Supabase: `fhcsvvlwhwqzlsltrkuq`

### Production Target
- Repo: `dowa-tht/it-management`
- Supabase: `yrgsukhjkoexvdybyyjm`

---

## 2. Approved First-Migration Scope

- reset production repo ทั้งก้อน
- reset production database ทั้งก้อน
- apply migration chain ทั้งหมดจาก `supabase/migrations/`
- seed schema-aligned baseline data
- migrate selected users เฉพาะ:
  - `admin@dowa-tht.co.th`
  - `natthawut@dowa-tht.co.th`
- migrate `permission_sets` ทั้งชุด
- ไม่ย้าย transaction data
- ไม่ย้าย audit/log history

---

## 3. Operator Order

1. Lock release source
   - ล็อก `source commit SHA`
   - ล็อก migration file list
   - ล็อก selected user list
   - ล็อก baseline seed artifact version

2. Take production checkpoints
   - backup production DB แบบ full
   - backup production repo/deployment reference
   - บันทึก rollback point ที่กู้กลับได้จริง

3. Freeze production writes
   - หยุดการเปลี่ยนแปลงบน production ชั่วคราว
   - ห้ามมี manual data patch ระหว่าง migration window

4. Reset production repo
   - sync `dowa-tht/it-management` ให้ตรง approved release จาก `trush000/dowa-it-system`
   - รอบแรกห้าม cherry-pick เฉพาะบางไฟล์

5. Reset production DB
   - ล้าง production database หลัง backup สำเร็จแล้วเท่านั้น
   - ต้องยืนยันว่า production กลับสู่ clean state ก่อน apply schema

6. Apply schema chain
   - ใช้ลำดับ timestamp ตามไฟล์ใน `supabase/migrations/`
   - รวม 2 migrations วันที่ `2026-06-08` ด้วย:
     - `20260608_align_substitute_and_target_group_schema_to_runtime.sql`
     - `20260608_enable_rls_for_substitutes_and_lock_legacy_sla_tables.sql`

7. Seed baseline config
   - `system_settings`
   - `master_data`
   - `holidays`
   - `permission_sets`

8. Seed checklist baseline
   - `checklist_procedure_plans`
   - `checklist_templates`
   - `checklist_targets`
   - `checklist_template_targets`
   - `checklist_template_procedure_plans`

9. Bootstrap selected users
   - create `auth.users` สำหรับ 2 emails ที่อนุมัติ
   - upsert `user_profiles`
   - upsert `user_whitelist`
   - reset sensitive user state ทั้งหมดตาม carry-forward policy

10. Seed workflow baseline
   - `workflow_configs`
   - `approval_substitutes`
   - ต้อง remap user references ให้ชี้ไป selected users ที่ถูกสร้างบน production แล้ว

11. Seed numbering baseline
   - `no_series`
   - `no_series_lines`

12. Run verification pack
   - auth/login ของ 2 selected users
   - settings pages load ได้
   - permission preset ใช้งานได้
   - workflow config อ่านได้
   - substitute flow อ่าน/เขียนได้ตาม RLS contract
   - `working_hours`, `sla_exclusions`, `sla_holidays` ถูก lock ตาม RLS plan

13. Release decision
   - ถ้า verification ผ่านทั้งหมดจึงเปิด production ใช้งาน
   - ถ้า fail ที่ schema/seed/reference ให้ rollback ก่อนเปิดใช้งาน

---

## 4. Exact Schema Apply List

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

---

## 5. Exact Seed Order

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

---

## 6. Stop Conditions

- backup หรือ rollback point ยังไม่พร้อม
- production repo reset ไม่ตรง release SHA
- migration file ใด fail
- selected users สร้างไม่ครบ 2 accounts
- `workflow_configs` หรือ `approval_substitutes` มี user reference remap ไม่ครบ
- verification pack fail แม้เพียงข้อเดียว

ถ้าเกิดเงื่อนไขใดเงื่อนไขหนึ่ง:
- หยุด migration ทันที
- ห้ามเปิด production ใช้งาน
- ใช้ rollback plan ตาม [RELEASE_AND_ROLLBACK_CHECKLIST.md](/C:/Users/Lenovo/dowa-it-system/docs/manuals/RELEASE_AND_ROLLBACK_CHECKLIST.md:1)

---

## 7. Related Documents

- [PRODUCTION_REBASELINE_EXECUTION_RUNBOOK.md](/C:/Users/Lenovo/dowa-it-system/docs/manuals/PRODUCTION_REBASELINE_EXECUTION_RUNBOOK.md:1)
- [PRODUCTION_REBASELINE_FINAL_IN_SCOPE_TABLE_LIST.md](/C:/Users/Lenovo/dowa-it-system/docs/manuals/PRODUCTION_REBASELINE_FINAL_IN_SCOPE_TABLE_LIST.md:1)
- [PRODUCTION_REBASELINE_SEED_EXTRACTION_MAPPING.md](/C:/Users/Lenovo/dowa-it-system/docs/manuals/PRODUCTION_REBASELINE_SEED_EXTRACTION_MAPPING.md:1)
- [AUDIT_PRODUCTION_REBASELINE_SCHEMA_VERIFICATION_2026_06_08.md](/C:/Users/Lenovo/dowa-it-system/docs/history/AUDIT_PRODUCTION_REBASELINE_SCHEMA_VERIFICATION_2026_06_08.md:1)
