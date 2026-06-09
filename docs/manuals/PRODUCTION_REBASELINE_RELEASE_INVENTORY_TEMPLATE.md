# Production Re-baseline Release Inventory Template

เอกสารนี้เป็น template สำหรับกรอก `release inventory` ของ first production re-baseline

> [!IMPORTANT]
> ให้คัดลอก template นี้ไปใช้กับ release จริง แล้วกรอกค่าทุกช่องก่อนเริ่ม execute

---

## Release Header

```text
RELEASE_NAME: <fill-me>
RELEASE_VERSION: <fill-me>
MODE: Production Migration Mode
SOURCE_REPO: trush000/dowa-it-system
SOURCE_COMMIT_SHA: <fill-me>
SOURCE_DB: fhcsvvlwhwqzlsltrkuq
TARGET_REPO: dowa-tht/it-management
TARGET_DB: yrgsukhjkoexvdybyyjm
OPERATOR: <fill-me>
BACKUP_REFERENCE: <fill-me>
ROLLBACK_REFERENCE: <fill-me>
EXECUTION_WINDOW: <fill-me>
```

---

## Scope Lock

```text
IN-SCOPE:
- system_settings
- master_data
- holidays
- permission_sets
- checklist_procedure_plans
- checklist_templates
- checklist_targets
- checklist_template_targets
- checklist_template_procedure_plans
- auth.users (selected 2 only)
- user_profiles (selected 2 only)
- user_whitelist (selected 2 only)
- workflow_configs
- approval_substitutes
- no_series
- no_series_lines

OUT-OF-SCOPE:
- incidents
- document_approvals
- checklist_docs
- checklist_items
- incident_logs
- incident_exclusions
- email_otps
- system_audit_logs
- admin_audit_logs
- backup_logs
- system_logs
- login_logs
```

---

## Selected Users

```text
1) admin@dowa-tht.co.th
   ROLE: admin
   IS_ACTIVE: true
   CAN_BE_ASSIGNEE: false

2) natthawut@dowa-tht.co.th
   ROLE: it_staff
   IS_ACTIVE: true
   CAN_BE_ASSIGNEE: true
```

---

## Migration File List

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

---

## Artifact Checklist

```text
[ ] 01-metadata/release_inventory.json
[ ] 02-baseline-config/system_settings.json
[ ] 02-baseline-config/master_data.json
[ ] 02-baseline-config/holidays.json
[ ] 02-baseline-config/permission_sets.json
[ ] 03-baseline-checklist/checklist_procedure_plans.json
[ ] 03-baseline-checklist/checklist_templates.json
[ ] 03-baseline-checklist/checklist_targets.json
[ ] 03-baseline-checklist/checklist_template_targets.json
[ ] 03-baseline-checklist/checklist_template_procedure_plans.json
[ ] 04-selected-users/auth_users.json
[ ] 04-selected-users/user_profiles.json
[ ] 04-selected-users/user_whitelist.json
[ ] 04-selected-users/user_id_mapping_plan.json
[ ] 05-baseline-workflow/workflow_configs.json
[ ] 05-baseline-workflow/approval_substitutes.json
[ ] 06-baseline-number-series/no_series.json
[ ] 06-baseline-number-series/no_series_lines.json
[ ] 07-verification/export_row_counts.json
[ ] 07-verification/referential_integrity_checks.md
```

---

## Sign-off

```text
PLANNING_SIGNOFF: <fill-me>
EXECUTION_SIGNOFF: <fill-me>
VERIFICATION_SIGNOFF: <fill-me>
FINAL_DECISION: PASS / FAIL / ROLLBACK
```
