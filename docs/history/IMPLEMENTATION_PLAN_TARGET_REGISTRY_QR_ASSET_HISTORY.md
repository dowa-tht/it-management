# Implementation Plan: Target Registry & QR Asset History

**Created:** 2026-05-14 20:10  
**Status:** PLANNED  
**Scope:** ออกแบบและเตรียมการพัฒนา `Target Registry`, `QR Navigation`, และ `Asset History` สำหรับ Checklist แบบผูกสินทรัพย์รายตัว โดยต่อยอดจาก `Checklist Template Builder` และ `Procedure Plan Editor` ที่ implement แล้ว

---

## 1. Background

สถานะปัจจุบันของระบบ:

1. `Checklist Template Builder` สามารถกำหนด `template_config` เชิงลึกสำหรับ `T0-T5` ได้แล้ว
2. `Procedure Plan Editor` สามารถจัดการ `checklist_procedure_plans.steps.rows[]` ได้แล้ว
3. Checklist execution engine ยังทำงานแบบ template-centric เป็นหลัก และยังไม่มีโครง `target-centric history`

ผลคือระบบพร้อมในระดับ “ออกแบบ template” แล้ว แต่ยังขาดส่วนที่ทำให้ template เหล่านั้นผูกกับ asset จริง เช่น `CCTV Terminal Box`, `UPS`, `NVR`, `Switch`, หรืออุปกรณ์รายจุดอื่น ๆ

---

## 2. Current Evidence

### 2.1 Template layer พร้อมสำหรับการผูก target

- [checklist-template.js](/C:/Users/Lenovo/dowa-it-system/app/actions/checklist-template.js:42) โหลด `checklist_templates` และ `checklist_procedure_plans` มาใช้ร่วมกันแล้ว
- [checklistTemplateValidation.js](/C:/Users/Lenovo/dowa-it-system/lib/checklistTemplateValidation.js:273) มี `T2 Procedure Table` ที่อ้างอิง `plan_id`
- [DOCUMENT_MAPPING_STANDARD.md](/C:/Users/Lenovo/dowa-it-system/docs/standards/DOCUMENT_MAPPING_STANDARD.md:61) ระบุ schema ขั้นต่ำของ `template_config` ชัดเจนแล้ว

### 2.2 Procedure layer พร้อมสำหรับ SOP ราย asset

- [procedure-plan.js](/C:/Users/Lenovo/dowa-it-system/app/actions/procedure-plan.js:42) จัดการ `checklist_procedure_plans`
- [procedurePlanValidation.js](/C:/Users/Lenovo/dowa-it-system/lib/procedurePlanValidation.js:1) นิยาม step object มาตรฐานไว้แล้ว
- [DOCUMENT_MAPPING_STANDARD.md](/C:/Users/Lenovo/dowa-it-system/docs/standards/DOCUMENT_MAPPING_STANDARD.md:73) ระบุ mapping ของ `steps.rows[]` แล้ว

### 2.3 Execution layer ยังไม่ target-aware

- [page.js](/C:/Users/Lenovo/dowa-it-system/app/dashboard/checklist/page.js:649) snapshot `ui_template_type`
- [page.js](/C:/Users/Lenovo/dowa-it-system/app/dashboard/checklist/page.js:650) snapshot `config: t.template_config || {}`
- [page.js](/C:/Users/Lenovo/dowa-it-system/app/dashboard/checklist/[id]/page.js:728) `ProcedureTemplate` อ่าน `plan_id` แล้ว render steps ได้

ข้อสรุป:

1. ชั้น template พร้อมแล้ว
2. ชั้น SOP พร้อมแล้ว
3. สิ่งที่ยังขาดคือ data model + routes + generation logic + history queries สำหรับ target จริง

---

## 3. Goals

1. สร้าง master data สำหรับ target/asset ที่สามารถลงทะเบียนอุปกรณ์รายตัวได้
2. รองรับ QR code ต่อ target หนึ่งรายการ
3. ทำให้ Checklist สามารถสร้าง item/doc ที่ผูกกับ `target_id` ได้
4. เพิ่มหน้า history ราย target เพื่อดูผลตรวจย้อนหลัง, หลักฐานภาพ, และ incident ที่เกี่ยวข้อง
5. ออกแบบ flow ให้ scan QR แล้วไปหน้า history ก่อน จากนั้นค่อยเริ่มรอบตรวจใหม่

---

## 4. Non-Goals

1. ยังไม่ทำ bulk import asset จากไฟล์ในรอบแรก
2. ยังไม่ทำ dashboard analytics ใหม่ทั้งระบบ
3. ยังไม่ redesign หน้า checklist execution ทั้งหน้า หากยังใช้ component เดิมได้

---

## 5. Proposed Data Model

### 5.1 New Tables

#### `checklist_targets`

Field หลัก:

1. `id`
2. `target_code`
3. `target_type`
4. `name`
5. `location`
6. `qr_value`
7. `metadata`
8. `is_active`
9. `created_at`
10. `updated_at`

ตัวอย่าง `metadata`:

```json
{
  "site": "Plant 1",
  "building": "A",
  "floor": "2",
  "zone": "North Wing",
  "serial_no": "CTV-TB-0021",
  "vendor": "Schneider"
}
```

#### `checklist_target_groups`

ใช้เมื่อต้องผูก template กับ asset แบบเป็นชุด:

1. `id`
2. `group_code`
3. `group_name`
4. `target_type`
5. `description`

#### `checklist_template_targets`

ใช้สำหรับ mapping ระหว่าง template กับ target/group:

1. `id`
2. `template_id`
3. `target_id`
4. `target_group_id`
5. `target_type`
6. `is_active`

### 5.2 Existing Table Changes

#### `checklist_templates`

เพิ่ม:

1. `scope_mode`
2. `target_type`
3. `config_version`

#### `checklist_docs`

เพิ่ม:

1. `target_id`
2. `target_type`
3. `history_scope`

#### `checklist_items`

เพิ่ม:

1. `target_id`
2. `target_snapshot`
3. `checked_at`
4. `evidence_summary`

---

## 6. Route Structure

### 6.1 Settings Routes

1. `/dashboard/settings/target-registry`
2. `/dashboard/settings/target-groups`
3. `/dashboard/settings/asset-history/[targetId]`
4. `/dashboard/settings/qr-scan`

### 6.2 Navigation Decision

QR scan flow ยึด decision เดิม:

1. scan QR
2. lookup target
3. open `Asset History`
4. user กด `Start New Inspection`
5. พาไป flow สร้าง checklist ที่ prefill `targetId`

---

## 7. UI Scope

### 7.1 Target Registry

ต้องมี:

1. target library list
2. search/filter by type/site/status
3. create/edit form
4. QR value display / regenerate
5. linked template summary

### 7.2 Asset History

ต้องมี:

1. hero card ของ asset
2. latest inspection status
3. timeline ย้อนหลังแบบ month / year
4. evidence strip หรือ gallery
5. related incidents panel
6. `Start New Inspection` button

### 7.3 QR Scan Screen

ต้องมี:

1. input / scanner capture
2. invalid QR state
3. loading state
4. redirect to target history

---

## 8. Query and Generation Logic

### 8.1 Checklist Creation Logic

```text
INPUT:
  freq_type
  period_date
  target_id? (optional in phase 1 UI)

FETCH active templates by freq_type

FOR EACH template
  IF scope_mode = global
    CREATE item แบบเดิม

  ELSE IF scope_mode = per_target
    FETCH active targets matching template.target_type or mapping table

    FOR EACH target
      CREATE checklist_item
      SET checklist_items.target_id = target.id
      SET checklist_items.target_snapshot = current target snapshot
      SET template_data._snapshot.target = target snapshot
      SET template_data._snapshot.config = template.template_config

  ELSE IF scope_mode = per_group
    FETCH targets in linked group
    REPEAT creation by target
```

### 8.2 Asset History Query Logic

```text
INPUT:
  target_id
  month?
  year?
  status?

QUERY checklist_items
  WHERE target_id = input.target_id

JOIN checklist_docs
  ON checklist_items.doc_id = checklist_docs.id

JOIN incidents (optional)
  ON incidents.ref_type = 'checklist'
  AND incidents.ref_id = checklist_items.id

GROUP RESULT BY:
  year
  month
  doc_id
  template_id

RETURN:
  latest inspection summary
  evidence summary
  related incidents
  timeline rows
```

### 8.3 QR Navigation Logic

```text
INPUT qr_value

LOOKUP checklist_targets.qr_value

IF target not found
  SHOW "QR ไม่ถูกต้องหรือยังไม่ได้ลงทะเบียน"
  STOP

ELSE
  ROUTE TO /dashboard/settings/asset-history/[targetId]
```

---

## 9. Recommended Implementation Phases

### Phase 1: Data Foundation

1. migration สำหรับ `checklist_targets`, `checklist_target_groups`, `checklist_template_targets`
2. เพิ่ม field target-related ใน `checklist_docs` และ `checklist_items`
3. สร้าง RLS policy

### Phase 2: Settings UI

1. สร้าง `Target Registry`
2. สร้าง `Target Groups`
3. เพิ่มทางเข้าใน Settings

### Phase 3: Template Mapping

1. เพิ่ม `scope_mode` และ `target_type` ใน Template Builder
2. เพิ่ม UI สำหรับผูก template กับ target/group

### Phase 4: Asset-Aware Checklist Generation

1. ปรับ logic สร้าง checklist docs/items ให้รองรับ `target_id`
2. snapshot target ลง item
3. แสดง target context ใน checklist detail

### Phase 5: QR History

1. สร้าง `Asset History` route
2. ทำ query timeline + gallery
3. สร้าง `QR Scan` entry
4. เพิ่ม `Start New Inspection`

---

## 10. Detailed Pseudocode for Execution

### 10.1 Save Target

```text
VALIDATE target_code NOT EMPTY
VALIDATE target_type NOT EMPTY
VALIDATE qr_value UNIQUE

IF editing existing target
  UPDATE checklist_targets
ELSE
  INSERT checklist_targets
```

### 10.2 Save Template Mapping

```text
IF scope_mode = global
  target_type = NULL
  template_target rows optional

IF scope_mode = per_target
  REQUIRE target_type
  REQUIRE at least one mapping strategy:
    - target_type based
    OR
    - explicit target assignment

IF scope_mode = per_group
  REQUIRE target_group_id at least one

SAVE checklist_templates
SAVE checklist_template_targets
```

### 10.3 Open Asset History

```text
FETCH target by id
IF not found
  RETURN not-found UI

FETCH checklist_items for target
FETCH checklist_docs for related items
FETCH incidents linked from checklist items

BUILD timeline rows:
  inspection_date
  template label
  status
  inspector
  evidence count
  incident count
```

---

## 11. Risks and Mitigations

### Risk 1: Query หนักเมื่อ asset มีรูปย้อนหลังจำนวนมาก

Mitigation:

1. แยก summary query ออกจาก gallery query
2. paginate หลักฐานภาพ
3. index ที่ `target_id`, `doc_id`, `period_date`

### Risk 2: Checklist generation ซ้ำซ้อนเมื่อ template/global/per-target ปนกัน

Mitigation:

1. แยก branch logic ตาม `scope_mode`
2. เพิ่ม test case สำหรับ `global`, `per_target`, `per_group`
3. ใช้ unique guard ในขั้นสร้าง item/doc

### Risk 3: QR value ชนกัน

Mitigation:

1. unique index
2. generate ด้วย prefix ตาม `target_type`
3. verify ซ้ำที่ server ก่อน save

---

## 12. Recommended Next Execution Order

1. สร้าง migration และมาตรฐาน table ก่อน
2. ทำ `Target Registry` route
3. เพิ่ม mapping เข้า `Template Builder`
4. ทำ checklist generation ให้ target-aware
5. ทำ `Asset History`
6. ทำ `QR Scan` navigation

---

## 13. Deliverables

เมื่อจบเฟสนี้ ระบบต้องมี:

1. target master สำหรับ asset รายตัว
2. QR lookup ที่ใช้งานจริง
3. checklist item/doc ที่รู้จัก target
4. history ราย asset ที่ดูย้อนหลังได้
5. flow `scan -> history -> start new inspection`
