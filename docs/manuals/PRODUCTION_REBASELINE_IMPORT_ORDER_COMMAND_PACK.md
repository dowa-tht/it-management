# Production Re-baseline Import Order Command Pack

เอกสารนี้เป็น `command pack template` สำหรับวัน execute จริง โดยออกแบบให้ operator อ่านตามลำดับเดียวและไม่สลับ environment

> [!IMPORTANT]
> เอกสารนี้ยังเป็น template ใน `Migration Planning Mode`
>
> ห้ามใช้กับ production จริงจนกว่า:
> 1. USER จะเลือก `Production Migration Mode`
> 2. backup พร้อม
> 3. release inventory ถูกกรอกครบ

---

## 1. Environment Lock Banner

ทุกครั้งก่อนเริ่ม ให้บันทึก banner นี้ใน execution log:

```text
MODE: Production Migration Mode
SOURCE_REPO: trush000/dowa-it-system
SOURCE_DB: fhcsvvlwhwqzlsltrkuq
TARGET_REPO: dowa-tht/it-management
TARGET_DB: yrgsukhjkoexvdybyyjm
RELEASE_NAME: <fill-me>
SOURCE_COMMIT_SHA: <fill-me>
EXECUTION_TIMESTAMP: <fill-me>
```

---

## 2. Required Inputs

- approved release name
- source commit SHA
- exported artifacts folder
- production backup reference
- rollback reference
- operator name

---

## 3. Command Pack Sequence

## Block A. Preflight Record

1. ยืนยัน environment banner
2. ยืนยัน backup reference
3. ยืนยัน source commit SHA
4. ยืนยัน artifact folder path
5. ยืนยัน selected users:
   - `admin@dowa-tht.co.th`
   - `natthawut@dowa-tht.co.th`

ถ้าข้อใดข้อหนึ่งขาด:
- หยุดทันที

---

## Block B. Schema Apply Pack

ใช้ migration order นี้เท่านั้น:

```text
20260505_base_schema_bootstrap.sql
20260506_add_member_role.sql
20260506_user_management_upgrade.sql
20260507_add_onboarding_expiry.sql
20260507_add_recovery_columns.sql
20260508_admin_audit_logs.sql
20260508_workflow_refinement_phase_2.sql
20260510_add_assigned_to_id_to_incidents.sql
20260512_fix_document_approvals_verified_by_pin.sql
20260517_checklist_collaboration.sql
20260519_add_approver_id_to_workflow_configs.sql
20260519_fill_missing_tables.sql
20260521_remove_target_groups.sql
20260523_fix_stuck_daily_approvals.sql
20260523_reporter_email_otp.sql
20260525_cancel_document_support.sql
20260525_checklist_item_steps.sql
20260525_checklist_time_tracking.sql
20260525_template_procedure_plan_many_to_many.sql
20260526_checklist_doc_evaluation.sql
20260529_fix_incident_reporter_approver_mapping.sql
20260529_incident_followup_tokens.sql
20260605_checklist_auditor_readonly_rls.sql
20260606_fix_auditor_readonly_rls_leaks.sql
20260608_align_substitute_and_target_group_schema_to_runtime.sql
20260608_enable_rls_for_substitutes_and_lock_legacy_sla_tables.sql
add_rls_policies.sql
```

### Block B operator rule
- migration fail 1 ไฟล์ = stop
- ห้ามข้ามไฟล์
- ห้ามรัน ad-hoc SQL นอกไฟล์ migration

---

## Block C. Seed Import Pack

ใช้ลำดับนี้เท่านั้น:

```text
01 system_settings
02 master_data
03 holidays
04 permission_sets
05 checklist_procedure_plans
06 checklist_templates
07 checklist_targets
08 checklist_template_targets
09 checklist_template_procedure_plans
10 auth.users
11 user_profiles
12 user_whitelist
13 workflow_configs
14 approval_substitutes
15 no_series
16 no_series_lines
```

---

## 4. Table Command Templates

หมายเหตุ:
- ด้านล่างเป็น `template verbs`
- operator ต้องแทน `<artifact-path>` และ `<release-name>` ให้ครบก่อน execute

### Config group

```text
IMPORT system_settings FROM <artifact-path>\02-baseline-config\system_settings.json
IMPORT master_data FROM <artifact-path>\02-baseline-config\master_data.json
IMPORT holidays FROM <artifact-path>\02-baseline-config\holidays.json
IMPORT permission_sets FROM <artifact-path>\02-baseline-config\permission_sets.json
```

### Checklist group

```text
IMPORT checklist_procedure_plans FROM <artifact-path>\03-baseline-checklist\checklist_procedure_plans.json
IMPORT checklist_templates FROM <artifact-path>\03-baseline-checklist\checklist_templates.json
IMPORT checklist_targets FROM <artifact-path>\03-baseline-checklist\checklist_targets.json
IMPORT checklist_template_targets FROM <artifact-path>\03-baseline-checklist\checklist_template_targets.json
IMPORT checklist_template_procedure_plans FROM <artifact-path>\03-baseline-checklist\checklist_template_procedure_plans.json
```

### Selected users group

```text
CREATE auth.users FOR admin@dowa-tht.co.th
CREATE auth.users FOR natthawut@dowa-tht.co.th
UPSERT user_profiles FROM <artifact-path>\04-selected-users\user_profiles.json
UPSERT user_whitelist FROM <artifact-path>\04-selected-users\user_whitelist.json
WRITE user_id_mapping_plan TO execution log
```

### Workflow group

```text
REMAP workflow_configs.approver_id USING user_id_mapping_plan
IMPORT workflow_configs FROM <artifact-path>\05-baseline-workflow\workflow_configs.json
REMAP approval_substitutes.primary_approver_id USING user_id_mapping_plan
REMAP approval_substitutes.substitute_id USING user_id_mapping_plan
IMPORT approval_substitutes FROM <artifact-path>\05-baseline-workflow\approval_substitutes.json
```

### Number series group

```text
IMPORT no_series FROM <artifact-path>\06-baseline-number-series\no_series.json
IMPORT no_series_lines FROM <artifact-path>\06-baseline-number-series\no_series_lines.json
```

---

## 5. Stop Conditions Embedded in Command Pack

หยุดทันทีเมื่อ:

1. migration file ใด fail
2. selected users ถูกสร้างไม่ครบ
3. `user_id_mapping_plan` ไม่ครบ 2 users
4. `workflow_configs` มี approver remap ไม่ได้
5. `approval_substitutes` มี user remap ไม่ได้
6. orphan mapping ถูกพบหลัง import
7. verification pack fail

---

## 6. Execution Log Minimum Fields

ทุก block ต้องบันทึก:

- `step_name`
- `started_at`
- `finished_at`
- `operator`
- `target_repo`
- `target_db`
- `artifact_file`
- `rows_expected`
- `rows_imported`
- `status`
- `notes`

---

## 7. Hand-off to Verification Pack

หลังจบ import ทั้งหมด ห้ามเปิดใช้งาน production ทันที

ต้องส่งต่อไปยัง:
- [PRODUCTION_REBASELINE_VERIFICATION_RUN_SEQUENCE.md](/C:/Users/Lenovo/dowa-it-system/docs/manuals/PRODUCTION_REBASELINE_VERIFICATION_RUN_SEQUENCE.md:1)

---

## 8. Related Documents

- [PRODUCTION_REBASELINE_EXPORT_ARTIFACT_PLAN.md](/C:/Users/Lenovo/dowa-it-system/docs/manuals/PRODUCTION_REBASELINE_EXPORT_ARTIFACT_PLAN.md:1)
- [PRODUCTION_REBASELINE_PRODUCTION_APPLY_ORDER.md](/C:/Users/Lenovo/dowa-it-system/docs/manuals/PRODUCTION_REBASELINE_PRODUCTION_APPLY_ORDER.md:1)
- [RELEASE_AND_ROLLBACK_CHECKLIST.md](/C:/Users/Lenovo/dowa-it-system/docs/manuals/RELEASE_AND_ROLLBACK_CHECKLIST.md:1)
