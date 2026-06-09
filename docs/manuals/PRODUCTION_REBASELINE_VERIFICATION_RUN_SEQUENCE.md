# Production Re-baseline Verification Run Sequence

เอกสารนี้เป็น `post-import verification pack` สำหรับใช้หลัง schema apply และ seed import เสร็จแล้วในวัน migration จริง

> [!IMPORTANT]
> ใช้เอกสารนี้ได้เฉพาะหลัง import ครบทุก block แล้ว
>
> ถ้าข้อใดใน section `Critical Release Gates` fail:
> - ห้ามเปิด production ใช้งาน
> - ให้เข้าสู่ rollback decision ทันที

---

## 1. Verification Objective

ยืนยัน 4 เรื่องก่อน release:

1. schema ตรงกับ release
2. baseline data เข้าอย่างครบและไม่ orphan
3. selected users ใช้งานได้จริง
4. security boundary สำคัญยังอยู่

---

## 2. Verification Order

ใช้ลำดับนี้เท่านั้น:

1. `schema verification`
2. `row-count verification`
3. `dependency verification`
4. `selected user verification`
5. `settings and master-data smoke test`
6. `workflow and substitute verification`
7. `RLS/security sanity verification`
8. `release decision`

---

## 3. Critical Release Gates

ต้องผ่านทุกข้อ:

- migrations apply ครบ
- in-scope tables row counts สมเหตุสมผล
- selected users login ได้ครบ 2 คน
- `workflow_configs` อ่านได้
- `approval_substitutes` ใช้งานได้ตาม contract
- `working_hours`, `sla_exclusions`, `sla_holidays` ถูก lock ตามแผน
- ไม่มี orphan mapping ใน checklist baseline

---

## 4. Run Sequence

## Step 1. Schema Verification

ตรวจ:
- ตารางสำคัญอยู่ครบ
- columns สำคัญอยู่ครบ
- 2 migrations วันที่ `2026-06-08` มีผลแล้ว

Target tables:
- `workflow_configs`
- `approval_substitutes`
- `checklist_targets`
- `checklist_templates`
- `checklist_procedure_plans`
- `no_series`
- `no_series_lines`

Pass criteria:
- ไม่พบ schema drift เทียบกับ approved docs

---

## Step 2. Row-count Verification

ต้องมีการเปรียบเทียบ:
- exported row counts
- imported row counts

Tables:
- `system_settings`
- `master_data`
- `holidays`
- `permission_sets`
- `checklist_procedure_plans`
- `checklist_templates`
- `checklist_targets`
- `checklist_template_targets`
- `checklist_template_procedure_plans`
- `workflow_configs`
- `approval_substitutes`
- `no_series`
- `no_series_lines`
- `user_profiles`
- `user_whitelist`

Pass criteria:
- เท่ากัน หรือมีเหตุผล documented ชัดเจน

---

## Step 3. Dependency Verification

ต้องตรวจว่าไม่มี orphan:

1. `checklist_template_targets.template_id`
2. `checklist_template_targets.target_id`
3. `checklist_template_procedure_plans.template_id`
4. `checklist_template_procedure_plans.plan_id`
5. `no_series_lines.series_code`

Pass criteria:
- orphan count = 0 ทุกข้อ

---

## Step 4. Selected User Verification

Users:
- `admin@dowa-tht.co.th`
- `natthawut@dowa-tht.co.th`

ต้องตรวจ:
- `auth.users` ถูกสร้างครบ
- `user_profiles.role` ถูกต้อง
- `is_active = true`
- `can_be_assignee` ตรงตามแผน
- `user_whitelist` มีครบ
- sensitive fields ถูก reset

Pass criteria:
- ทั้ง 2 users login ได้
- roles/state ถูกต้อง

---

## Step 5. Settings and Master-data Smoke Test

หน้าอย่างน้อยที่ต้องเปิดได้:
- dashboard
- settings / working hours
- settings / holidays
- settings / workflow
- settings / permissions
- settings / no series
- settings / substitutes
- checklist master / target registry

Pass criteria:
- page load ได้
- ไม่ error จาก baseline data ที่เพิ่ง import

---

## Step 6. Workflow and Substitute Verification

ต้องตรวจ:
- `workflow_configs.approver_id` remap ถูก
- `approval_substitutes.primary_approver_id` remap ถูก
- `approval_substitutes.substitute_id` remap ถูก
- owner/substitute read contract ยังใช้ได้

Pass criteria:
- ไม่พบ reference แตก
- substitute flow ใช้ได้ตาม intended contract

---

## Step 7. RLS / Security Sanity

ต้องตรวจอย่างน้อย:
- `approval_substitutes` มี policies ครบ
- `working_hours` ถูก lock admin-only
- `sla_exclusions` ถูก lock admin-only
- `sla_holidays` ถูก lock admin-only
- ไม่พบ policy หายจาก release scope

Known non-blocking items for this first cut:
- `user_whitelist` hardening backlog
- function hardening backlog
- leaked password protection backlog

Pass criteria:
- blocker security items ของ first cut ผ่านครบ

---

## Step 8. Release Decision

### Release Success
ให้เปิด production ได้เมื่อ:
- ทุก critical gate ผ่าน
- ไม่มี rollback trigger
- operator sign-off ครบ

### Release Fail
ให้ rollback ทันทีเมื่อ:
- selected user login fail
- workflow/substitute remap fail
- schema drift ใหม่เกิดขึ้น
- settings pages สำคัญเปิดไม่ได้
- critical RLS mismatch

---

## 5. Verification Result Template

ใช้ template นี้กับแต่ละ step:

| Step | Status | Evidence | Decision | Note |
|---|---|---|---|---|
| Step 1 | `PASS` / `FAIL` | query / screenshot / page | release / fix / rollback | short note |

---

## 6. Final Sign-off Block

```text
RELEASE_NAME: <fill-me>
SOURCE_COMMIT_SHA: <fill-me>
TARGET_REPO: dowa-tht/it-management
TARGET_DB: yrgsukhjkoexvdybyyjm
VERIFICATION_RESULT: PASS / FAIL
ROLLBACK_REQUIRED: YES / NO
OPERATOR: <fill-me>
TIMESTAMP: <fill-me>
```

---

## 7. Related Documents

- [PRODUCTION_REBASELINE_IMPORT_ORDER_COMMAND_PACK.md](/C:/Users/Lenovo/dowa-it-system/docs/manuals/PRODUCTION_REBASELINE_IMPORT_ORDER_COMMAND_PACK.md:1)
- [PRODUCTION_REBASELINE_PRODUCTION_APPLY_ORDER.md](/C:/Users/Lenovo/dowa-it-system/docs/manuals/PRODUCTION_REBASELINE_PRODUCTION_APPLY_ORDER.md:1)
- [PRODUCTION_REBASELINE_SCHEMA_VERIFICATION_CHECKLIST.md](/C:/Users/Lenovo/dowa-it-system/docs/manuals/PRODUCTION_REBASELINE_SCHEMA_VERIFICATION_CHECKLIST.md:1)
