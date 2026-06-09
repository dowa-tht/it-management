# Production Re-baseline Schema Verification Checklist

เอกสารนี้ใช้สำหรับปิดรายการ `must-verify` ก่อนนำ [PRODUCTION_REBASELINE_EXECUTION_RUNBOOK.md](/C:/Users/Lenovo/dowa-it-system/docs/manuals/PRODUCTION_REBASELINE_EXECUTION_RUNBOOK.md:1) ไปใช้จริงใน `Production Migration Mode`

> [!IMPORTANT]
> Checklist นี้ใช้ใน `Migration Planning Mode` หรือก่อนเริ่ม execute จริงเท่านั้น  
> เป้าหมายคือยืนยันว่า `development schema/runtime contract` ตรงกับสิ่งที่ runbook คาดหวัง

---

## 1. Exit Criteria

ถือว่าผ่าน checklist นี้ได้เมื่อ:

1. ทุกหัวข้อใน section `Must-Verify Before Execution` ถูกตอบว่า `PASS` หรือ `Not Applicable`
2. ทุก drift ที่พบมีการบันทึก decision ว่าจะ:
   - accept
   - remediate
   - remove from scope
3. ไม่มี unknown schema dependency ค้างอยู่ใน green scope หรือ selected user scope

---

## 2. Verification Status Template

ใช้รูปแบบนี้กับแต่ละหัวข้อ:

| Item | Status | Evidence | Decision | Note |
|---|---|---|---|---|
| ตัวอย่าง | `PASS` / `FAIL` / `N/A` | file, line, query, screenshot, export | accept / remediate / remove | สั้น กระชับ |

---

## 3. Must-Verify Checklist

## A. `workflow_configs` runtime contract

### A1. ตรวจ schema จาก migration
- ตรวจ:
  - [20260519_fill_missing_tables.sql](/C:/Users/Lenovo/dowa-it-system/supabase/migrations/20260519_fill_missing_tables.sql:190)
  - [20260519_add_approver_id_to_workflow_configs.sql](/C:/Users/Lenovo/dowa-it-system/supabase/migrations/20260519_add_approver_id_to_workflow_configs.sql:3)
- คาดหวังอย่างน้อย:
  - `doc_type`
  - `target_type`
  - `condition_value`
  - `step_order`
  - `role_required`
  - `approver_id`
  - `is_active`

### A2. ตรวจ runtime usage
- ตรวจ:
  - [workflow/page.js](/C:/Users/Lenovo/dowa-it-system/app/dashboard/settings/workflow/page.js:98)
  - [workflow/page.js](/C:/Users/Lenovo/dowa-it-system/app/dashboard/settings/workflow/page.js:223)
  - [workflow.js](/C:/Users/Lenovo/dowa-it-system/app/actions/workflow.js:1267)
  - [workflow.js](/C:/Users/Lenovo/dowa-it-system/app/actions/workflow.js:1382)
- ต้องตอบให้ได้:
  - runtime ต้องใช้ `condition_key` หรือไม่
  - ถ้าใช่ field นี้อยู่ใน live dev schema หรือเกิดจาก transform ฝั่ง code

### A3. Decision
- `PASS` เมื่อ schema และ runtime ใช้ field ชุดเดียวกัน
- `FAIL` เมื่อ UI/action อ้าง field ที่ schema จริงไม่มี

---

## B. `approval_substitutes` schema drift

### B1. ตรวจ migration base contract
- ตรวจ [20260519_fill_missing_tables.sql](/C:/Users/Lenovo/dowa-it-system/supabase/migrations/20260519_fill_missing_tables.sql:207)
- คาดหวัง field:
  - `primary_approver_id`
  - `substitute_approver_id`
  - `is_active`
  - `starts_at`
  - `ends_at`
  - `notes`

### B2. ตรวจ runtime usage
- ตรวจ:
  - [substitutes/page.js](/C:/Users/Lenovo/dowa-it-system/app/dashboard/settings/substitutes/page.js:15)
  - [substitutes/page.js](/C:/Users/Lenovo/dowa-it-system/app/dashboard/settings/substitutes/page.js:91)
  - [workflow.js](/C:/Users/Lenovo/dowa-it-system/app/actions/workflow.js:565)
- ต้องตอบให้ได้:
  - live schema ใช้ชื่อคอลัมน์ชุด `substitute_id/start_date/end_date/reason` หรือไม่
  - ถ้าไม่ใช่ ต้องมี remediation plan ก่อน execute

### B3. Decision
- `PASS` เมื่อ field names ตรงกับ live schema ที่จะ extract/import
- `FAIL` เมื่อโค้ดกับ DB contract คนละชุดและยังไม่มีแผนแก้

---

## C. `checklist_targets` หลัง remove target groups

### C1. ตรวจ migration transition
- ตรวจ:
  - [20260519_fill_missing_tables.sql](/C:/Users/Lenovo/dowa-it-system/supabase/migrations/20260519_fill_missing_tables.sql:122)
  - [20260521_remove_target_groups.sql](/C:/Users/Lenovo/dowa-it-system/supabase/migrations/20260521_remove_target_groups.sql:24)

### C2. ตรวจ runtime usage
- ตรวจ:
  - [MasterDataScope.js](/C:/Users/Lenovo/dowa-it-system/app/dashboard/settings/_components/MasterDataScope.js:218)
  - [target.js](/C:/Users/Lenovo/dowa-it-system/app/actions/target.js:463)
  - [target.js](/C:/Users/Lenovo/dowa-it-system/app/actions/target.js:526)

### C3. Decision
- `PASS` เมื่อ live schema ไม่มี `target_group_id` แล้วและ action/UI ใช้งานได้กับ shape ปัจจุบัน
- `FAIL` เมื่อ export/import plan ยังอิง field ที่ถูกลบไปแล้ว

---

## D. `checklist_templates` และ `checklist_procedure_plans`

### D1. ตรวจ base schema
- ตรวจ:
  - [20260519_fill_missing_tables.sql](/C:/Users/Lenovo/dowa-it-system/supabase/migrations/20260519_fill_missing_tables.sql:77)
  - [20260519_fill_missing_tables.sql](/C:/Users/Lenovo/dowa-it-system/supabase/migrations/20260519_fill_missing_tables.sql:103)
  - [20260525_template_procedure_plan_many_to_many.sql](/C:/Users/Lenovo/dowa-it-system/supabase/migrations/20260525_template_procedure_plan_many_to_many.sql:12)

### D2. ตรวจ runtime usage
- ตรวจ:
  - [checklist-template.js](/C:/Users/Lenovo/dowa-it-system/app/actions/checklist-template.js:46)
  - [checklist-template.js](/C:/Users/Lenovo/dowa-it-system/app/actions/checklist-template.js:344)
  - [procedure-plan.js](/C:/Users/Lenovo/dowa-it-system/app/actions/procedure-plan.js:70)

### D3. Decision
- `PASS` เมื่อ field ที่ต้อง extract/import ครบและ relation table ใช้ได้จริง
- `FAIL` เมื่อ parent/child shape ยังไม่ตรงกัน

---

## E. `no_series` runtime helper contract

### E1. ตรวจ schema
- ตรวจ:
  - [20260519_fill_missing_tables.sql](/C:/Users/Lenovo/dowa-it-system/supabase/migrations/20260519_fill_missing_tables.sql:228)
  - [20260519_fill_missing_tables.sql](/C:/Users/Lenovo/dowa-it-system/supabase/migrations/20260519_fill_missing_tables.sql:237)

### E2. ตรวจ runtime usage
- ตรวจ:
  - [no-series/page.js](/C:/Users/Lenovo/dowa-it-system/app/dashboard/settings/no-series/page.js:80)
  - [noSeries.js](/C:/Users/Lenovo/dowa-it-system/lib/noSeries.js:52)
  - [noSeries.js](/C:/Users/Lenovo/dowa-it-system/lib/noSeries.js:68)
  - [noSeries.js](/C:/Users/Lenovo/dowa-it-system/lib/noSeries.js:102)

### E3. Decision
- `PASS` เมื่อ field ที่ helper ใช้มีอยู่จริงใน live schema หรือมี fallback ที่พิสูจน์ได้
- `FAIL` เมื่อ helper อ้าง field ที่ schema ไม่มี

---

## F. Selected users correctness

### F1. Users in scope
- `admin@dowa-tht.co.th`
- `natthawut@dowa-tht.co.th`

### F2. Verify
- role ถูกต้อง
- `is_active = true`
- `can_be_assignee` ตรงกับ intended usage
- `email` ตรงกับ whitelist target

### F3. Evidence sources
- [admin.js](/C:/Users/Lenovo/dowa-it-system/app/actions/admin.js:149)
- [DATABASE_AND_FLOW.md](/C:/Users/Lenovo/dowa-it-system/docs/architecture/DATABASE_AND_FLOW.md:124)

### F4. Decision
- `PASS` เมื่อ user bootstrap policy สำหรับ 2 คนนี้ชัดเจนและใช้ได้
- `FAIL` เมื่อยังมี ambiguity เรื่อง role, assignee, expiry

---

## G. Workflow approver references outside scope

### G1. Verify
- `workflow_configs.approver_id` มี reference ไปยัง user นอก scope หรือไม่
- `approval_substitutes` มี reference ไปยัง user นอก scope หรือไม่

### G2. Decision
- `PASS` เมื่อ approver references อยู่ใน selected users หรือมีเหตุผลว่าจะ bootstrap user เพิ่มอย่างตั้งใจ
- `FAIL` เมื่อมี hidden dependency ไปยัง user ที่จะไม่ย้าย

---

## 4. Query / Audit Deliverables

ก่อนปิด checklist นี้ ควรมี artifact อย่างน้อย:

1. schema snapshot หรือ query result ของตารางเสี่ยง
2. list ของ fields ที่ confirmed แล้ว
3. list ของ drift ที่ยอมรับได้
4. list ของ drift ที่ต้องแก้ก่อน execute

---

## Related Documents

- `docs/manuals/PRODUCTION_REBASELINE_EXECUTION_RUNBOOK.md`
- `docs/manuals/PRODUCTION_REBASELINE_FINAL_IN_SCOPE_TABLE_LIST.md`
- `docs/manuals/PRODUCTION_MIGRATION_PLAYBOOK.md`
