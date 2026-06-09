# Audit: Production Re-baseline Schema Verification (08-Jun-2026)

เอกสารนี้เป็นผลการตรวจ `Schema Verification Checklist` รอบแรกสำหรับแผน `Production Re-baseline Migration`

---

## Scope

ตรวจเทียบ 3 แหล่งหลัก:

1. migration files ใน `supabase/migrations/`
2. runtime code ที่ใช้งานตารางจริงใน `app/` และ `lib/`
3. `dev Supabase` schema/state ของ project `fhcsvvlwhwqzlsltrkuq`

---

## Result Summary

| Item | Status | Decision | Summary |
|---|---|---|---|
| `workflow_configs` runtime contract | `PASS` | accept | live schema มี `condition_key` และโค้ดใช้งานตรงกัน |
| `approval_substitutes` schema drift | `PASS` | accept | live schema ถูก align เป็น `substitute_id/start_date/end_date/reason` แล้ว |
| `checklist_targets` after remove target groups | `PASS` | accept | live schema ไม่มี `checklist_target_groups` และไม่มี `checklist_template_targets.target_group_id` แล้ว |
| `checklist_templates` / `checklist_procedure_plans` runtime contract | `PASS` | accept | live schema มี field เสริมที่ runtime ใช้งานจริง |
| `no_series` runtime helper contract | `PASS` | accept | live schema มี `format`, `linked_form`, `last_no_used` ตามที่ helper ใช้ |
| selected users correctness | `PASS` | accept | 2 users อยู่ใน dev DB และมี role/state ตรงตามแผน |
| workflow/substitute references outside selected scope | `PASS` | accept | ไม่พบ row ที่อ้าง approver/substitute นอก 2 users ที่เลือก |

---

## Detailed Findings

## 1. `workflow_configs` runtime contract

### Evidence
- migration base เดิมไม่มี `condition_key` ใน [20260519_fill_missing_tables.sql](/C:/Users/Lenovo/dowa-it-system/supabase/migrations/20260519_fill_missing_tables.sql:228)
- runtime page/query ใช้ `condition_key` ที่ [app/dashboard/settings/workflow/page.js](/C:/Users/Lenovo/dowa-it-system/app/dashboard/settings/workflow/page.js:223)
- runtime actions ใช้ `condition_key` ที่ [app/actions/workflow.js](/C:/Users/Lenovo/dowa-it-system/app/actions/workflow.js:1270), [app/actions/workflow.js](/C:/Users/Lenovo/dowa-it-system/app/actions/workflow.js:1385)
- live dev schema query พบ columns:
  - `target_type`
  - `condition_key`
  - `condition_value`
  - `step_order`
  - `role_required`
  - `is_active`
  - `approver_id`
  - `doc_type`

### Decision
- `PASS`
- runbook สามารถใช้ `condition_key` เป็นส่วนหนึ่งของ verified contract ได้แล้ว

---

## 2. `approval_substitutes` schema drift

### Evidence
- migration/schema base:
  - `substitute_approver_id`, `starts_at`, `ends_at`, `notes`
  - อ้างอิงจาก [20260519_fill_missing_tables.sql](/C:/Users/Lenovo/dowa-it-system/supabase/migrations/20260519_fill_missing_tables.sql:253)
- runtime code ยังใช้อีกชุด:
  - `substitute_id`, `start_date`, `end_date`, `reason`
  - อ้างอิงจาก [app/dashboard/settings/substitutes/page.js](/C:/Users/Lenovo/dowa-it-system/app/dashboard/settings/substitutes/page.js:93), [app/actions/workflow.js](/C:/Users/Lenovo/dowa-it-system/app/actions/workflow.js:566), [lib/workflow.js](/C:/Users/Lenovo/dowa-it-system/lib/workflow.js:103)
- live dev schema query ยืนยันว่า table จริงมี:
  - `primary_approver_id`
  - `substitute_approver_id`
  - `is_active`
  - `starts_at`
  - `ends_at`
  - `notes`

### Decision
- `PASS`

### Remediation Status
- สร้าง migration [20260608_align_substitute_and_target_group_schema_to_runtime.sql](/C:/Users/Lenovo/dowa-it-system/supabase/migrations/20260608_align_substitute_and_target_group_schema_to_runtime.sql:1) แล้ว
- หลัง apply manual บน dev schema จริง ตอนนี้ columns ของ `approval_substitutes` เหลือ:
  - `primary_approver_id`
  - `substitute_id`
  - `start_date`
  - `end_date`
  - `reason`
- ไม่พบการอ้าง reference นอก selected users (`substitute_rows_with_external_refs = 0`)

---

## 3. `checklist_targets` / target groups drift

### Evidence
- migration `remove target groups` ตั้งใจลบ `target_group_id` และ drop `checklist_target_groups` ที่ [20260521_remove_target_groups.sql](/C:/Users/Lenovo/dowa-it-system/supabase/migrations/20260521_remove_target_groups.sql:32)
- แต่ live dev schema ยังพบ:
  - table `public.checklist_target_groups`
  - column `public.checklist_template_targets.target_group_id`
- runtime code หลายจุดเปลี่ยนไปใช้ `scope_mode = per_type` แล้ว เช่น [app/actions/checklist-template.js](/C:/Users/Lenovo/dowa-it-system/app/actions/checklist-template.js:237), [lib/checklistTemplateValidation.js](/C:/Users/Lenovo/dowa-it-system/lib/checklistTemplateValidation.js:115)

### Decision
- `PASS`

### Remediation Status
- migration [20260608_align_substitute_and_target_group_schema_to_runtime.sql](/C:/Users/Lenovo/dowa-it-system/supabase/migrations/20260608_align_substitute_and_target_group_schema_to_runtime.sql:1) ถูกนำไป apply บน dev แล้ว
- live dev schema ตอนนี้:
  - ไม่มี table `checklist_target_groups`
  - ไม่มี column `checklist_template_targets.target_group_id`
- target-group drift ถือว่าปิดได้แล้ว

---

## 4. `checklist_templates` / `checklist_procedure_plans`

### Evidence
- runtime ใช้ fields เพิ่มเติม:
  - `scope_mode`, `target_type`, `config_version`, `validation_rules`, `incident_rules`
  - อ้างอิงจาก [app/actions/checklist-template.js](/C:/Users/Lenovo/dowa-it-system/app/actions/checklist-template.js:94), [app/actions/checklist-template.js](/C:/Users/Lenovo/dowa-it-system/app/actions/checklist-template.js:216)
- live dev schema ยืนยันว่ามี:
  - `checklist_templates.scope_mode`
  - `checklist_templates.target_type`
  - `checklist_templates.config_version`
  - `checklist_templates.validation_rules`
  - `checklist_templates.incident_rules`
  - `checklist_procedure_plans.description`

### Decision
- `PASS`
- extraction mapping ควรอัปเดตให้ field เสริมเหล่านี้เป็น verified carry-forward fields ในรอบถัดไป

---

## 5. `no_series` runtime helper contract

### Evidence
- runtime helper ใช้ `format`, `linked_form`, `last_no_used` ที่ [lib/noSeries.js](/C:/Users/Lenovo/dowa-it-system/lib/noSeries.js:53), [lib/noSeries.js](/C:/Users/Lenovo/dowa-it-system/lib/noSeries.js:71), [lib/noSeries.js](/C:/Users/Lenovo/dowa-it-system/lib/noSeries.js:102)
- live dev schema ยืนยันว่ามี fields:
  - `format`
  - `linked_form`
  - `last_no_used`
  - `starting_no`
  - `ending_no`
  - `last_date_used`
- `no_series_lines` live schema ก็มี `format`, `last_no_used`, `starting_no`, `ending_no`

### Decision
- `PASS`

---

## 6. Selected users correctness

### Evidence
- live dev query:
  - `admin@dowa-tht.co.th` → `role=admin`, `is_active=true`, `can_be_assignee=false`
  - `natthawut@dowa-tht.co.th` → `role=it_staff`, `is_active=true`, `can_be_assignee=true`
- create flow มาตรฐานยังอ้าง `user_profiles` + `user_whitelist` ที่ [app/actions/admin.js](/C:/Users/Lenovo/dowa-it-system/app/actions/admin.js:167), [app/actions/admin.js](/C:/Users/Lenovo/dowa-it-system/app/actions/admin.js:185)

### Decision
- `PASS`

---

## 7. Workflow / substitute references outside selected scope

### Evidence
- live dev query:
  - `workflow_rows_with_external_approver_refs = 0`
  - `substitute_rows_with_external_refs = 0`

### Decision
- `PASS`

---

## Security Follow-up Resolution

เดิม `dev Supabase` เคยมี advisory ว่า RLS ถูกปิดอยู่บน 4 tables:
- `public.working_hours`
- `public.sla_exclusions`
- `public.sla_holidays`
- `public.approval_substitutes`

### Latest Evidence
- USER apply manual migration สำเร็จใน `dev Supabase` เมื่อ `09-Jun-2026`
- live verification หลัง apply ยืนยันว่า:
  - `approval_substitutes.rls_enabled = true`
  - `working_hours.rls_enabled = true`
  - `sla_exclusions.rls_enabled = true`
  - `sla_holidays.rls_enabled = true`
- live verification ของ `pg_policies` ยืนยันว่า:
  - `approval_substitutes` มี 5 policies ตามแผน
  - `working_hours`, `sla_exclusions`, `sla_holidays` มี `admin_all_*` policies ตามแผน

### Decision
- security follow-up เดิมเรื่อง `RLS disabled` สำหรับ 4 ตารางนี้ถือว่า `RESOLVED ON DEV`
- สำหรับ migration planning scope รอบแรก ให้ถือว่าโครงสร้างด้าน RLS ของ dev baseline ผ่านตามแผน remediation แล้ว

### Remaining Non-blocking Advisors
- `public.user_whitelist` ยังมี advisory `RLS enabled no policy`
- มี `function_search_path_mutable` และ `security definer executable` advisories หลายจุด
- advisories เหล่านี้ยังไม่ได้อยู่ใน scope ของ production re-baseline RLS remediation รอบนี้

---

## Final Decision

สถานะ checklist รอบล่าสุด: `PASS`

### Passed
- `workflow_configs`
- `checklist_templates` / `checklist_procedure_plans`
- `no_series`
- selected users correctness
- external approver reference check

### Gate Result
- `พร้อม` สำหรับเดินต่อในส่วน schema alignment และ dev-side RLS baseline ของ execution runbook
- blocker เดิมเรื่อง `RLS disabled` บน:
  - `working_hours`
  - `sla_exclusions`
  - `sla_holidays`
  - `approval_substitutes`
  ถูกปิดแล้วบน dev
- หากจะย้ายไปขั้นถัดไป ให้โฟกัสเรื่อง production apply order และ optional security hardening อื่นที่นอก scope รอบนี้แทน

---

## Related Documents

- [PRODUCTION_REBASELINE_SCHEMA_VERIFICATION_CHECKLIST.md](file:///c:/Users/Lenovo/dowa-it-system/docs/manuals/PRODUCTION_REBASELINE_SCHEMA_VERIFICATION_CHECKLIST.md)
- [PRODUCTION_REBASELINE_SEED_EXTRACTION_MAPPING.md](file:///c:/Users/Lenovo/dowa-it-system/docs/manuals/PRODUCTION_REBASELINE_SEED_EXTRACTION_MAPPING.md)
- [PRODUCTION_REBASELINE_EXECUTION_RUNBOOK.md](file:///c:/Users/Lenovo/dowa-it-system/docs/manuals/PRODUCTION_REBASELINE_EXECUTION_RUNBOOK.md)
- [PRODUCTION_REBASELINE_RLS_REMEDIATION_PLAN.md](file:///c:/Users/Lenovo/dowa-it-system/docs/manuals/PRODUCTION_REBASELINE_RLS_REMEDIATION_PLAN.md)
