# Production Re-baseline Export Artifact Plan

เอกสารนี้ใช้กำหนด `export artifacts` ที่ต้องเตรียมจาก `development source` ก่อนเข้าสู่ `Production Migration Mode`

> [!IMPORTANT]
> เอกสารนี้ใช้ใน `Migration Planning Mode` เท่านั้น
>
> ห้ามรัน export จาก production target
> ห้ามใช้ artifact นี้กับ environment อื่นนอกจากที่ระบุไว้โดยไม่แก้ header ให้ถูกต้องก่อน

---

## 1. Fixed Export Source

### Development Source
- Repo: `trush000/dowa-it-system`
- Local path: `C:\Users\Lenovo\dowa-it-system`
- Supabase project: `fhcsvvlwhwqzlsltrkuq`

### Planned Production Target
- Repo: `dowa-tht/it-management`
- Supabase project: `yrgsukhjkoexvdybyyjm`

---

## 2. Export Objective

เตรียม artifact 5 กลุ่มสำหรับ first production re-baseline:

1. `baseline-config`
2. `baseline-checklist`
3. `baseline-workflow`
4. `baseline-number-series`
5. `selected-users`

ทุก artifact ต้อง:
- ระบุ `export_timestamp`
- ระบุ `source_commit_sha`
- ระบุ `source_supabase_project`
- ระบุ `table_name`
- ใช้เฉพาะ fields ที่อยู่ใน approved scope

---

## 3. Recommended Artifact Layout

แนะนำให้จัดเก็บนอก repo หลักในวัน execute จริง เช่น release folder ที่มีชื่อ release ชัดเจน

ตัวอย่าง:

```text
production-rebaseline/
  01-metadata/
    release_inventory.json
  02-baseline-config/
    system_settings.json
    master_data.json
    holidays.json
    permission_sets.json
  03-baseline-checklist/
    checklist_procedure_plans.json
    checklist_templates.json
    checklist_targets.json
    checklist_template_targets.json
    checklist_template_procedure_plans.json
  04-selected-users/
    auth_users.json
    user_profiles.json
    user_whitelist.json
    user_id_mapping_plan.json
  05-baseline-workflow/
    workflow_configs.json
    approval_substitutes.json
  06-baseline-number-series/
    no_series.json
    no_series_lines.json
  07-verification/
    export_row_counts.json
    referential_integrity_checks.md
```

---

## 4. Export Order

ใช้ลำดับนี้เพื่อลด parent-child drift:

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

## 5. Table-by-Table Export Contract

| Table | Artifact file | Key filter | Fields | Pre-export check |
|---|---|---|---|---|
| `system_settings` | `system_settings.json` | approved baseline keys only | `key`, `value` | ไม่มี key นอก scope |
| `master_data` | `master_data.json` | approved `type` only | `type`, `value`, `sort_order`, `is_active` | ไม่มี type นอก scope |
| `holidays` | `holidays.json` | none | `holiday_date`, `description` | duplicate date = 0 |
| `permission_sets` | `permission_sets.json` | none | `role_name`, `feature_key`, `access_level`, `can_view`, `can_create`, `can_edit`, `can_delete` | duplicate pair = 0 |
| `checklist_procedure_plans` | `checklist_procedure_plans.json` | none | approved plan fields | `steps` parse ได้ |
| `checklist_templates` | `checklist_templates.json` | none | approved template fields | category in scope |
| `checklist_targets` | `checklist_targets.json` | none | approved target fields | no legacy target-group field |
| `checklist_template_targets` | `checklist_template_targets.json` | none | `template_id`, `target_id`, `target_type`, `is_active` | parent exists |
| `checklist_template_procedure_plans` | `checklist_template_procedure_plans.json` | none | `template_id`, `plan_id`, `is_default`, `sort_order`, `is_active` | parent exists |
| `auth.users` | `auth_users.json` | selected emails only | selected metadata only | exactly 2 rows |
| `user_profiles` | `user_profiles.json` | selected emails only | `id`, `email`, `full_name`, `role`, `is_active`, `can_be_assignee`, `expires_at` | exactly 2 rows |
| `user_whitelist` | `user_whitelist.json` | selected email hashes only | `email_hash` | exactly 2 rows |
| `workflow_configs` | `workflow_configs.json` | none | approved workflow fields | no external approver refs |
| `approval_substitutes` | `approval_substitutes.json` | none | `primary_approver_id`, `substitute_id`, `is_active`, `start_date`, `end_date`, `reason` | no external user refs |
| `no_series` | `no_series.json` | none | approved no-series fields | unique `code` |
| `no_series_lines` | `no_series_lines.json` | none | approved no-series-line fields | parent exists |

---

## 6. Required Metadata File

ต้องมี `01-metadata/release_inventory.json` อย่างน้อย:

```json
{
  "release_name": "production-rebaseline-v1",
  "source_repo": "trush000/dowa-it-system",
  "source_commit_sha": "<fill-me>",
  "source_supabase_project": "fhcsvvlwhwqzlsltrkuq",
  "planned_target_repo": "dowa-tht/it-management",
  "planned_target_supabase_project": "yrgsukhjkoexvdybyyjm",
  "export_timestamp": "<fill-me>",
  "selected_users": [
    "admin@dowa-tht.co.th",
    "natthawut@dowa-tht.co.th"
  ]
}
```

---

## 7. Selected User Export Rules

### Included
- `admin@dowa-tht.co.th`
- `natthawut@dowa-tht.co.th`

### Keep
- `auth.users.email`
- `user_profiles.id`
- `user_profiles.email`
- `user_profiles.full_name`
- `user_profiles.role`
- `user_profiles.is_active`
- `user_profiles.can_be_assignee`
- `user_profiles.expires_at`
- `user_whitelist.email_hash`

### Do not carry forward
- `signature_pin`
- `otp_*`
- `is_onboarded`
- `onboarding_*`
- `force_password_change`
- `recovery_*`
- `pin_reset_*`

---

## 8. Referential Integrity Checks Before Sign-off

ก่อนถือว่า export ผ่าน ต้องตอบให้ได้:

1. `checklist_template_targets.template_id` มี parent ครบ
2. `checklist_template_targets.target_id` มี parent ครบ
3. `checklist_template_procedure_plans.template_id` มี parent ครบ
4. `checklist_template_procedure_plans.plan_id` มี parent ครบ
5. `workflow_configs.approver_id` ชี้อยู่ใน selected users หรือเป็น `null`
6. `approval_substitutes.primary_approver_id` และ `substitute_id` ชี้อยู่ใน selected users
7. `no_series_lines.series_code` มี parent ครบ

---

## 9. Export Sign-off Checklist

- `release_inventory.json` ถูกกรอกครบ
- artifact ครบทุก table ใน scope
- row counts ถูกบันทึก
- ไม่มี out-of-scope rows ปะปน
- selected users มีครบ 2 รายการ
- dependency checks ผ่านทั้งหมด
- file names และ group folders ถูกต้อง

---

## 10. Related Documents

- [PRODUCTION_REBASELINE_SEED_EXTRACTION_MAPPING.md](/C:/Users/Lenovo/dowa-it-system/docs/manuals/PRODUCTION_REBASELINE_SEED_EXTRACTION_MAPPING.md:1)
- [PRODUCTION_REBASELINE_PRODUCTION_APPLY_ORDER.md](/C:/Users/Lenovo/dowa-it-system/docs/manuals/PRODUCTION_REBASELINE_PRODUCTION_APPLY_ORDER.md:1)
- [PRODUCTION_REBASELINE_FINAL_IN_SCOPE_TABLE_LIST.md](/C:/Users/Lenovo/dowa-it-system/docs/manuals/PRODUCTION_REBASELINE_FINAL_IN_SCOPE_TABLE_LIST.md:1)
