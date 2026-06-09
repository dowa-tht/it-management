# Production Re-baseline Export Row Counts Template

ใช้ template นี้คู่กับ `PRODUCTION_REBASELINE_EXPORT_SQL_PACK.md` เพื่อบันทึก row counts ฝั่ง `dev Supabase`

---

## Template

| Table | Expected Rule | Exported Row Count | Status | Note |
|---|---|---|---|---|
| `system_settings` | approved keys only | `<fill-me>` | `PASS/FAIL` | `<fill-me>` |
| `master_data` | approved types only | `<fill-me>` | `PASS/FAIL` | `<fill-me>` |
| `holidays` | all rows | `<fill-me>` | `PASS/FAIL` | `<fill-me>` |
| `permission_sets` | all rows | `<fill-me>` | `PASS/FAIL` | `<fill-me>` |
| `checklist_procedure_plans` | all rows | `<fill-me>` | `PASS/FAIL` | `<fill-me>` |
| `checklist_templates` | all rows | `<fill-me>` | `PASS/FAIL` | `<fill-me>` |
| `checklist_targets` | all rows | `<fill-me>` | `PASS/FAIL` | `<fill-me>` |
| `checklist_template_targets` | all rows | `<fill-me>` | `PASS/FAIL` | `<fill-me>` |
| `checklist_template_procedure_plans` | all rows | `<fill-me>` | `PASS/FAIL` | `<fill-me>` |
| `auth.users` | exactly 2 selected users | `<fill-me>` | `PASS/FAIL` | `<fill-me>` |
| `user_profiles` | exactly 2 selected users | `<fill-me>` | `PASS/FAIL` | `<fill-me>` |
| `user_whitelist` | exactly 2 selected users | `<fill-me>` | `PASS/FAIL` | `<fill-me>` |
| `workflow_configs` | all rows | `<fill-me>` | `PASS/FAIL` | `<fill-me>` |
| `approval_substitutes` | all rows | `<fill-me>` | `PASS/FAIL` | `<fill-me>` |
| `no_series` | all rows | `<fill-me>` | `PASS/FAIL` | `<fill-me>` |
| `no_series_lines` | all rows | `<fill-me>` | `PASS/FAIL` | `<fill-me>` |

---

## Summary

```text
EXPORT_TIMESTAMP: <fill-me>
SOURCE_COMMIT_SHA: <fill-me>
TOTAL_TABLES_CHECKED: 16
FAILED_TABLES: <fill-me>
EXPORT_ROW_COUNTS_SIGNOFF: <fill-me>
```
