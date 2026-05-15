# Implementation Plan: Checklist Template Master & Asset History

**Created:** 2026-05-14 13:11  
**Status:** PARTIALLY IMPLEMENTED — Template Builder, Procedure Plan Editor, Optional Photo Geolocation, layout hardening, Target Registry foundation, migration, and automated test baseline completed; Asset History architecture hardening remains pending  
**Last Updated:** 2026-05-15 06:36 +07:00  
**Scope:** ปรับปรุง `Checklist Template Master` ให้ตั้งค่า Template ได้ละเอียด, แก้ช่องว่างของ `Procedure Plans`, และออกแบบโครงสร้าง `Asset History` รองรับงานตรวจแบบผูกกับสินทรัพย์/อุปกรณ์ เช่น `CCTV Terminal Box` พร้อมการสแกน QR Code เพื่อตรวจสอบย้อนหลัง

---

## 0. Current Implementation Status

สถานะล่าสุดหลังดำเนินการวันที่ 14-15 พฤษภาคม 2569:

| Area | Status | Evidence |
|---|---|---|
| Checklist Template Builder | ✅ Implemented | route `/dashboard/settings/checklist-template-builder`, server action `app/actions/checklist-template.js`, validation `lib/checklistTemplateValidation.js`, UI components `ChecklistTemplateBuilderClient.js`, `TemplateForm.js`, `TemplatePreview.js` |
| Checklist Master create/edit flow | ✅ Implemented | ปุ่มสร้าง Template ใหม่เปิด `mode=create`, ปุ่มแก้ไขรายการเปิด `mode=edit&templateId=...`, และถอด quick-create inline ใน `MasterDataScope.js` |
| Procedure Plan Editor | ✅ Implemented | route `/dashboard/settings/procedure-plan-editor`, server action `app/actions/procedure-plan.js`, validation `lib/procedurePlanValidation.js`, และ `ProcedurePlanEditorClient.js` |
| Checklist execution compatibility | ✅ Implemented | `app/dashboard/checklist/[id]/page.js` รองรับ step object จาก `checklist_procedure_plans.steps.rows[]` และ optional photo geolocation metadata |
| UI/UX hardening | ✅ Implemented | ปรับ layout/spacing ของ Template Builder และ Procedure Plan Editor, ลด header/session footprint, และย้าย `Live Preview` / `Execution Preview` ไปเป็น modal trigger พร้อมสร้างมาตรฐาน `docs/standards/UI_LAYOUT_SPACING_REMEDIATION.md` |
| Target Registry migration + schema verification | ✅ Implemented | apply migration สำเร็จจาก `scripts/migration_target_registry.sql`; verified tables, columns, and indexes in Supabase SQL Editor |
| Target Registry + QR foundation | ✅ Implemented | route `/dashboard/settings/target-registry`, action `app/actions/target.js`, route `app/api/qr/lookup/route.js`, page `/dashboard/checklist/targets/[id]` |
| Automated test baseline | ✅ Implemented | `npm test`, `tests/target-registry.test.js`, `tests/qr-lookup-route.test.js`, `tests/run-tests.js` |
| Asset History architecture hardening | ✅ Implemented | `app/dashboard/checklist/targets/[id]/page.js` now loads through server-side `getTargetAssetHistory()` in `app/actions/target.js` instead of client-side direct Supabase access |
| Static template dependency reduction | ✅ Implemented | checklist creation no longer depends on static `CHECKLIST_TEMPLATES` fallback |

เอกสารฉบับนี้จึงเป็นทั้ง implementation history ของ Phase 1-2 และ source context สำหรับ phase ถัดไป โดย phase ที่เหลือควรยึดเอกสาร `IMPLEMENTATION_PLAN_TARGET_REGISTRY_QR_ASSET_HISTORY.md` เป็นแผนหลัก

---

## 1. Background

จากการตรวจสอบโค้ดจริง พบว่าระบบ Checklist ปัจจุบันมี Dynamic Engine ที่ดีอยู่แล้ว เพราะ:

1. ตาราง `checklist_templates` รองรับ `ui_template_type` และ `template_config`
2. ตอนสร้างเอกสาร ระบบ snapshot ค่าจาก Template ลงใน `checklist_items.template_data._snapshot`
3. หน้าปฏิบัติงาน Checklist รองรับการ render Template เฉพาะทางแล้ว เช่น Photo, Procedure, Measurement, Link, Sign-off

ในตอนเริ่มแผนนี้ ฝั่ง Admin Setup ยังมีช่องว่างสำคัญดังนี้:

1. หน้า `Checklist Master` ยังไม่มี Template Builder ที่ละเอียดพอ — **แก้แล้วด้วย route `/dashboard/settings/checklist-template-builder`**
2. `Procedure Plans` มีปุ่มแก้ไข แต่ยังไม่มีหน้าแก้ขั้นตอนจริง — **แก้แล้วด้วย route `/dashboard/settings/procedure-plan-editor`**
3. ยังไม่มีแนวคิด `Target / Asset / QR History` สำหรับงานที่ต้องตรวจย้อนหลังกระจายตามอุปกรณ์รายตัว
4. ยังมี dependency กับ static template list บางส่วน ทำให้ความยืดหยุ่นไม่สุด

---

## 2. Evidence-Based Findings

### 2.1 Checklist Master เดิมยังแก้ได้ไม่ลึก — Resolved

สถานะเดิม:

- `MasterDataScope.js` เคยมี flow แก้เฉพาะ field ทั่วไป และยังไม่มี UI สำหรับ `template_config` ตาม type
- หน้า `Checklist Master` เคยใช้ inline create/edit ที่เน้นสร้างรายการมากกว่าแก้ Template config เชิงลึก

สถานะปัจจุบัน:

- เพิ่ม standalone route `/dashboard/settings/checklist-template-builder`
- เพิ่ม server-side save flow ผ่าน `app/actions/checklist-template.js`
- เพิ่ม validation กลางใน `lib/checklistTemplateValidation.js`
- เพิ่ม UI แยก `TemplateForm.js` และ `TemplatePreview.js`
- ปุ่มสร้างจาก Checklist Master เปิด `mode=create`
- ปุ่มแก้ไขรายการเปิด `mode=edit&templateId=...`
- ปุ่มกลับหน้า Master Data กลับแท็บ `Checklist Master` ได้ถูกต้อง

### 2.2 Procedure Plans เดิมยังไม่สามารถ edit ขั้นตอนจริง — Resolved

สถานะเดิม:

- `Procedure Plans` เคยแก้ได้เฉพาะชื่อแผน
- ปุ่ม edit ยังไม่เปิด editor สำหรับ `steps.rows[]`

สถานะปัจจุบัน:

- เพิ่ม standalone route `/dashboard/settings/procedure-plan-editor`
- เพิ่ม server-side save flow ผ่าน `app/actions/procedure-plan.js`
- เพิ่ม validation กลางใน `lib/procedurePlanValidation.js`
- เพิ่ม `ProcedurePlanEditorClient.js` สำหรับ add/remove/reorder step, `step_type`, `required`, และ `evidence_rule`
- ปรับ Checklist Detail ให้ render step object จาก `checklist_procedure_plans.steps.rows[]`
- ปุ่มกลับหน้า Master Data กลับแท็บ `Procedure Plans` ได้ถูกต้อง

### 2.3 Execution Engine รองรับ Dynamic Config อยู่แล้ว

- [page.js:648](/C:/Users/Lenovo/dowa-it-system/app/dashboard/checklist/page.js#L648) สร้าง `_snapshot`
- [page.js:650](/C:/Users/Lenovo/dowa-it-system/app/dashboard/checklist/page.js#L650) snapshot `config: t.template_config || {}`
- [page.js:491](/C:/Users/Lenovo/dowa-it-system/app/dashboard/checklist/[id]/page.js#L491) `TemplateRenderer()` เลือก renderer ตาม `ui_template_type`
- [page.js:505](/C:/Users/Lenovo/dowa-it-system/app/dashboard/checklist/[id]/page.js#L505) `PhotoTemplate` ใช้ `config.photo_points`
- [page.js:536](/C:/Users/Lenovo/dowa-it-system/app/dashboard/checklist/[id]/page.js#L536) `ProcedureTemplate` ใช้ `config.plan_id`
- [page.js:550](/C:/Users/Lenovo/dowa-it-system/app/dashboard/checklist/[id]/page.js#L550) `MeasureTemplate` ใช้ threshold config
- [page.js:562](/C:/Users/Lenovo/dowa-it-system/app/dashboard/checklist/[id]/page.js#L562) `LinkTemplate` ใช้ `url` และ `note_required`
- [page.js:571](/C:/Users/Lenovo/dowa-it-system/app/dashboard/checklist/[id]/page.js#L571) `SignoffTemplate` ใช้ `signers`

### 2.4 ยังมี static dependency ที่ควรค่อย ๆ ลด

- [checklistItems.js:1](/C:/Users/Lenovo/dowa-it-system/lib/checklistItems.js#L1) มี `CHECKLIST_TEMPLATES`
- [page.js:641](/C:/Users/Lenovo/dowa-it-system/app/dashboard/checklist/page.js#L641) ยัง fallback ไปหา static template

---

## 3. Problem Statement

สถานะก่อน implement: ระบบ “เก็บโครงสร้าง Dynamic ได้” แต่ “ยังตั้งค่า Dynamic ไม่เต็มรูปแบบ”

สถานะหลัง implement Phase 1-2: ระบบตั้งค่า Template และ Procedure Plan เชิงลึกได้แล้ว แต่ยังเหลือช่องว่างฝั่ง Asset-aware checklist และ QR history

1. Admin สามารถออกแบบ Template เฉพาะงานผ่าน Template Builder ได้แล้ว
2. Admin สามารถสร้าง/แก้ Procedure Plan แบบ step editor ได้แล้ว
3. งานประเภทตรวจอุปกรณ์รายตัว เช่น `CCTV Terminal Box` ยังไม่มีประวัติย้อนหลังแบบ Asset-centric
4. การ scan QR เพื่อดูหลักฐานย้อนหลังยังไม่มี foundation data model

---

## 4. Goals

1. ทำให้ `Checklist Template Master` เป็นหน้าตั้งค่าเชิงลึก ไม่ใช่แค่รายชื่อ Template
2. ทำ `Procedure Plan Editor` ที่แก้ Step ได้จริง
3. รองรับ `Template Settings` แยกตามชนิด Template อย่างละเอียด
4. รองรับงาน 2 กลุ่มพร้อมกัน:
   - งานทั่วไปแบบไม่ผูกอุปกรณ์
   - งานแบบผูก Asset/Target รายตัว และดูย้อนหลังได้
5. รองรับ use case `CCTV Terminal Box` ที่ scan QR แล้วดูประวัติการตรวจย้อนหลังรายตู้ได้
6. ออกแบบโดยไม่ใช้ UI Hack และไม่ทำลาย checklist เอกสารเดิม

---

## 5. Non-Goals

1. ยังไม่รวมการ redesign หน้ารายงานทั้งหมดในเฟสแรก
2. ยังไม่ย้ายข้อมูล static template เดิมออกทั้งหมดในครั้งเดียว
3. ยังไม่เปลี่ยน workflow approval ของ Checklist ถ้าไม่จำเป็น

---

## 6. Core Design Principles

1. **Snapshot-First:** เอกสารที่ถูกสร้างแล้วต้องเก็บ snapshot ของ config ต่อไป เพื่อไม่ให้การแก้ Template ใหม่กระทบเอกสารเก่า
2. **Migration-Safe:** เปลี่ยนสถาปัตยกรรมโดยเสริม schema ไม่แก้ขัดด้วย UI logic
3. **Asset-Optional:** ไม่บังคับให้ทุก Template ต้องมี Asset History แต่ Template ที่เหมาะสมต้องรองรับได้
4. **Type-Driven Configuration:** แต่ละ Template Type ต้องมี schema และ validation ของตัวเอง
5. **Reusable Builder:** หน้าตั้งค่าเดียวกันต้องใช้ได้กับหลาย use case

---

## 7. Target UX / Functional Scope

### 7.1 Checklist Master เปลี่ยนเป็น Template Builder

จากเดิม:

```text
Category | Frequency | Item Label | Template | Status | Actions
```

เป็น:

```text
Template Library
- Search / Filter / Category / Frequency / Scope
- Template Cards or Advanced Table
- Quick Status + Usage Summary
- ปุ่ม Create Template
- ปุ่ม Edit Config
- ปุ่ม Preview
- ปุ่ม Clone
```

### 7.2 Procedure Plan เปลี่ยนเป็น Step Editor

รองรับ:

1. สร้าง/แก้ชื่อ SOP
2. เพิ่ม step
3. จัดลำดับ step
4. กำหนดชนิด step
5. กำหนดว่า step ไหนบังคับ
6. กำหนดว่า step ไหนต้องแนบรูป/ต้องกรอกหมายเหตุ/ต้องกรอกค่า

### 7.3 Asset History / QR Experience

รองรับ:

1. ลงทะเบียน asset/target เช่น `CCTV Terminal Box`
2. สร้าง QR ให้แต่ละ asset
3. scan QR แล้วเปิดหน้า history ราย asset
4. ดูหลักฐานย้อนหลังแยกตามเดือน/รอบตรวจ
5. เปิดรูปย้อนหลัง, เวลา, ผู้ตรวจ, ผล OK/NG และ incident ที่เกี่ยวข้อง

---

## 8. Template Classification และ Asset History Suitability

ตารางนี้เป็นข้อเสนอว่าชนิด Template ใด “ควรรองรับ” การผูกกับ `Asset History`

| Template | ควรรองรับ Asset History | เหตุผล |
|---|---|---|
| `T0 Standard` | ควรรองรับ | ใช้กับการตรวจอุปกรณ์รายจุดแบบ Yes/No ได้ เช่น สติกเกอร์ทรัพย์สิน, สภาพภายนอก |
| `T1 Photo Evidence` | ควรรองรับอย่างยิ่ง | เหมาะที่สุดสำหรับหลักฐานย้อนหลังรายอุปกรณ์ เช่น ภาพตู้ CCTV, Rack, UPS |
| `T2 Procedure Table` | ควรรองรับ | เหมาะกับ SOP บำรุงรักษา/ตรวจเชิงลำดับของ asset แต่ละตัว |
| `T3 Measurement` | ควรรองรับ | เหมาะกับอุปกรณ์ที่มีค่าอ่านได้ เช่น อุณหภูมิ, battery, voltage, disk usage |
| `T4 Link Verification` | รองรับแบบเลือกใช้ | เหมาะกับ asset ที่มี portal หรือ URL เฉพาะ เช่น กล้อง, NVR, switch management |
| `T5 Sign-off` | รองรับแบบประกอบ | ไม่ใช่ตัวเก็บหลักฐานหลัก แต่ใช้เป็นการรับรองการตรวจ asset ได้ |

### 8.1 Template ที่ควรเป็น Candidate ระยะแรกสำหรับ Asset History

1. `T1 Photo Evidence`
2. `T3 Measurement`
3. `T2 Procedure Table`
4. `T0 Standard`

### 8.2 Template ที่ควรใช้กับ Use Case CCTV Terminal Box

แนะนำให้ใช้ชุดผสมดังนี้:

1. `T1 Photo Evidence`
   - ถ่ายภาพหน้าตู้
   - ถ่ายภาพภายในตู้
   - ถ่ายภาพจุดต่อสาย/label
2. `T0 Standard`
   - ประตูตู้ปิดสนิทหรือไม่
   - มีความเสียหายภายนอกหรือไม่
3. `T3 Measurement`
   - ถ้ามีค่าที่ต้องอ่าน เช่น ไฟเลี้ยง, อุณหภูมิ, สถานะแบตเตอรี่
4. `T2 Procedure Table`
   - ถ้าต้องมีลำดับตรวจ เช่น เปิดตู้ > ตรวจสาย > ตรวจอุปกรณ์ > ปิดตู้

---

## 9. Functional Design

### 9.1 Template Builder Tabs

แต่ละ Template ควรมีหน้าตั้งค่าแบบแบ่งแท็บ:

1. `General`
   - Template Name
   - Category
   - Frequency
   - Description / Instruction
   - Active Status
2. `Template Type`
   - เลือก T0-T5
   - แสดง field ตามชนิด template
3. `Validation`
   - Required / Optional
   - Require note on NG
   - Auto-open incident
   - Severity default
4. `Target Scope`
   - `global`
   - `per_target`
   - `per_group`
   - target type / target group
5. `Preview`
   - จำลองหน้า checklist item จริง

### 9.2 Procedure Plan Editor

รองรับโครงสร้าง step:

```json
{
  "step_no": 1,
  "title": "เปิดฝาตู้",
  "instruction": "ตรวจสอบสภาพทั่วไปก่อนเปิด",
  "step_type": "check",
  "required": true,
  "evidence_rule": {
    "photo_required": false,
    "note_required": false
  }
}
```

ค่าที่ควรมี:

1. `check`
2. `photo`
3. `measure`
4. `text`
5. `link`

### 9.3 Asset History View

หน้าใหม่เชิงแนวคิด:

```text
/dashboard/checklist/targets/[id]
```

ส่วนประกอบ:

1. Asset Header
   - ชื่อ asset
   - รหัส
   - location
   - QR status
   - last inspection
2. History Timeline
   - เดือน
   - เวลาเช็ค
   - คนตรวจ
   - ผล OK/NG
3. Evidence Gallery
   - รูปย้อนหลัง
   - preview เต็มจอ
4. Related Incidents
5. Filters
   - month / year / status / template

---

## 10. Proposed Data Model

### 10.1 Existing Tables ที่จะขยาย

#### `checklist_templates`

เพิ่ม field:

1. `scope_mode` — `global | per_target | per_group`
2. `target_type` — nullable
3. `config_version` — integer
4. `validation_rules` — JSONB
5. `incident_rules` — JSONB

#### `checklist_docs`

เพิ่ม field:

1. `target_id` — nullable
2. `target_type` — nullable
3. `history_scope` — nullable

#### `checklist_items`

เพิ่ม field:

1. `target_id` — nullable
2. `target_snapshot` — JSONB
3. `checked_at` — nullable
4. `evidence_summary` — JSONB

### 10.2 New Tables ที่เสนอ

#### `checklist_targets`

ใช้เป็น master ของ asset/target

Field:

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

#### `checklist_target_groups`

ใช้จัดกลุ่ม asset

Field:

1. `id`
2. `group_code`
3. `group_name`
4. `target_type`
5. `description`

#### `checklist_template_targets`

ใช้ผูก Template กับ target/group

Field:

1. `id`
2. `template_id`
3. `target_id` — nullable
4. `target_group_id` — nullable
5. `target_type`
6. `is_active`

### 10.3 JSON Schema Draft สำหรับ `template_config`

#### T1 Photo Evidence

```json
{
  "photo_points": [
    "ภาพหน้าตู้",
    "ภาพภายในตู้",
    "ภาพสายและ label"
  ],
  "min_photos": 3,
  "allow_retake": true,
  "watermark": {
    "timestamp": true,
    "user": true,
    "target_code": true
  },
  "enable_location_toggle": true
}
```

### 10.4 Optional Geolocation for Photo Evidence

ในเฟสแรก geolocation จะเป็น **optional**

หลักการ:

1. Template `T1 Photo Evidence` สามารถเปิด `enable_location_toggle` เพื่อให้ UI แสดง switch `Attach Location`
2. เมื่อผู้ใช้เปิด switch นี้ ระบบจะเรียก browser geolocation API ตอนอัปโหลดรูป
3. หากผู้ใช้อนุญาต จะเก็บ `lat`, `lng`, `accuracy` และ `captured_at`
4. หากผู้ใช้ปฏิเสธสิทธิ์ หรือ browser ไม่รองรับ ระบบยังต้องบันทึกรูปได้ โดยเก็บสถานะและให้พิกัดเป็น `null`
5. ข้อมูลพิกัดถูกเก็บใน `checklist_items.template_data.photo_meta` คู่กับหลักฐานภาพ ไม่แยกไปอีกตารางในเฟสนี้

#### T2 Procedure Table

```json
{
  "plan_id": "uuid",
  "enforce_sequence": true,
  "require_all_steps": true
}
```

#### T3 Measurement

```json
{
  "unit": "°C",
  "min": 18,
  "max": 30,
  "decimal_places": 1,
  "fail_mode": "outside_range"
}
```

#### T4 Link Verification

```json
{
  "url": "https://example.local/device/123",
  "note_required": true,
  "screenshot_required": false
}
```

#### T5 Sign-off

```json
{
  "signers": ["it_staff", "admin"],
  "require_order": true,
  "pin_required": true
}
```

---

## 11. Technical Logic / Pseudocode

### 11.1 Save Template

```text
IF template_type = T1
  REQUIRE template_config.photo_points.length > 0

IF template_type = T2
  REQUIRE template_config.plan_id IS NOT NULL

IF template_type = T3
  REQUIRE template_config.unit IS NOT EMPTY
  REQUIRE template_config.min OR template_config.max

IF scope_mode = per_target
  REQUIRE target_type OR template-target assignment

SAVE checklist_templates
INCREMENT config_version WHEN config structure changes
```

### 11.2 Create Checklist Document

```text
FETCH active templates by freq_type

FOR EACH template
  IF scope_mode = global
    CREATE one checklist_item as current behavior

  ELSE IF scope_mode = per_target
    FETCH active targets by target_type / target_group
    FOR EACH target
      CREATE checklist_item
      SET checklist_items.target_id = target.id
      SET checklist_items.target_snapshot = current target snapshot
      SET template_data._snapshot.config = template.template_config
      SET template_data._snapshot.target = target snapshot

  ELSE IF scope_mode = per_group
    CREATE items grouped by assigned targets in same document
```

### 11.3 QR Scan Flow

```text
INPUT qr_value
LOOKUP checklist_targets.qr_value

IF not found
  SHOW invalid QR

ELSE
  OPEN target history page
  QUERY checklist_items WHERE target_id = found_target.id
  JOIN checklist_docs for period/date/status
  GROUP by month/year
  SHOW evidence gallery + timeline + incidents
```

### 11.4 Photo Evidence with Asset History

```text
WHEN user uploads photo
  COMPRESS image
  APPLY watermark(timestamp, target_code, user)
  UPLOAD to evidence storage
  SAVE path in template_data.photos[point]
  SAVE checked_at = NOW()
  UPDATE evidence_summary with point count and latest photo info
```

---

## 12. Proposed Screens

### 12.1 Settings > Checklist Master Data

เพิ่มโหมด:

1. `Checklist Category`
2. `Template Library`
3. `Procedure Plans`
4. `Target Registry`
5. `Target Groups`

### 12.2 Template Config Modal / Page

แนะนำให้เป็น page หรือ fullscreen dialog เพราะ field เยอะ:

```text
Header
Left: Template metadata
Center: Config form by type
Right: Live preview
Bottom: Save / Clone / Disable
```

### 12.3 QR Asset History Page

แนะนำ visual:

1. Hero card ของ asset
2. Monthly timeline
3. Photo proof strip
4. Status badges
5. Incident panel

---

## 13. Phased Implementation Plan

### Phase 1: Hardening Master UX

**Status:** ✅ Implemented

เป้าหมาย:

1. แยก `Checklist Master` เป็น Template Library
2. ทำ `Template Config` modal/page
3. ทำ `Procedure Plan Editor` ให้ใช้งานได้จริง

Deliverables:

1. สร้าง config editor ตาม T0-T5
2. save/read `template_config` ครบ
3. preview template ก่อนบันทึก
4. แก้ guide ให้ตรงกับของจริง

### Phase 2: Config Schema & Validation

**Status:** ✅ Implemented for Template Builder and Procedure Plan Editor baseline; `config_version` migration remains pending

เป้าหมาย:

1. นิยาม schema กลางสำหรับแต่ละ template type
2. validate ทั้งก่อน save และก่อน create document
3. เพิ่ม `config_version`

Deliverables:

1. server-side validation
2. migration schema
3. compatibility logic สำหรับเอกสารเดิม

### Phase 3: Target Registry Foundation

**Status:** ⏳ Pending — use `IMPLEMENTATION_PLAN_TARGET_REGISTRY_QR_ASSET_HISTORY.md` as active implementation plan

เป้าหมาย:

1. สร้าง `checklist_targets`
2. สร้าง `checklist_target_groups`
3. สร้าง assignment ระหว่าง template กับ target

Deliverables:

1. Target master page
2. QR value management
3. target assignment UI

### Phase 4: Asset-Aware Checklist Execution

**Status:** ⏳ Pending

เป้าหมาย:

1. ทำให้เอกสาร checklist รองรับ item แบบผูก target
2. render target context ใน checklist detail
3. snapshot ข้อมูล asset ลง item

Deliverables:

1. per-target item generation
2. target badge / location / asset identity card
3. richer evidence summary

### Phase 5: QR History & Evidence Timeline

**Status:** ⏳ Pending

เป้าหมาย:

1. สแกน QR แล้วเข้า history page
2. ดูย้อนหลังแบบ monthly / gallery / status timeline
3. เชื่อม incident ที่เกิดจาก checklist item

Deliverables:

1. target history page
2. photo gallery
3. monthly inspection summary
4. incident linkage panel

### Phase 6: Static Template Dependency Reduction

**Status:** ⏳ Pending

เป้าหมาย:

1. ค่อย ๆ ลดการ fallback จาก `lib/checklistItems.js`
2. ให้ database เป็น source of truth มากขึ้น

Deliverables:

1. dynamic frequency source
2. remove unnecessary fallback dependency
3. migration script สำหรับ initial seed

---

## 14. Recommended Development Order

1. ✅ ทำ `Template Builder` ก่อน
2. ✅ ทำ `Procedure Plan Editor`
3. ✅ ทำ schema validation baseline สำหรับ Template/Procedure save flow
4. ⏳ ทำ `Target Registry`
5. ⏳ ทำ per-target checklist generation
6. ⏳ ทำ `QR Asset History`
7. ⏳ ค่อยลด static fallback

เหตุผล:

1. ใช้ประโยชน์จาก engine ปัจจุบันได้เร็ว
2. ลดความเสี่ยงจากการแก้หลายชั้นพร้อมกัน
3. เปิด use case `CCTV Terminal Box` ได้แบบค่อยเป็นค่อยไป

---

## 15. Initial Use Case Blueprint: CCTV Terminal Box

### เป้าหมาย

เมื่อเจ้าหน้าที่สแกน QR ที่หน้าตู้:

1. เห็นชื่อตู้และตำแหน่ง
2. เห็นประวัติการตรวจแต่ละเดือน
3. เห็นรูปหลักฐานย้อนหลัง
4. เห็นว่าเดือนไหนมี NG และมี incident อะไรตามมา

### โครงสร้างแนะนำ

1. Target Type: `cctv_terminal_box`
2. Scope Mode: `per_target`
3. รอบตรวจ: `Monthly`
4. Template หลัก:
   - `Photo Evidence`: ภาพหน้าตู้, ภาพภายในตู้, ภาพ label
   - `Standard`: สภาพทั่วไป, สายไม่หลุด, ไม่มีความชื้น
   - `Procedure Table`: SOP การเปิดตรวจ
   - `Measurement`: ถ้ามีค่าให้อ่าน

### Logic

```text
FOR each active cctv_terminal_box
  FOR each month
    generate inspection items from assigned templates
```

---

## 16. Risks and Mitigations

### Risk 1: เอกสารเก่า render ไม่ตรงกับ config ใหม่

Mitigation:

1. ใช้ `_snapshot` ต่อไป
2. เพิ่ม `config_version`
3. ห้าม render จาก master ปัจจุบันอย่างเดียว

### Risk 2: Template ยืดหยุ่นมากจน validate ยาก

Mitigation:

1. แยก schema ตาม type
2. มี server-side validator
3. จำกัด field ตามประเภท

### Risk 3: QR History query หนัก

Mitigation:

1. index ที่ `target_id`, `period_date`
2. summary query แยกจาก gallery query
3. paginate รูปย้อนหลัง

### Risk 4: Static fallback กับ dynamic config ซ้อนกัน

Mitigation:

1. ทำ Phase 6 แยก
2. ระบุจุด fallback ให้ชัด
3. ย้ายทีละส่วน

---

## 17. Open Decisions ที่ควร Confirm ก่อนพัฒนา

> [!IMPORTANT]
> เพื่อให้ implementation ตรงกับ use case จริงที่สุด ควรยืนยัน decision ต่อไปนี้ก่อนเริ่มลงมือ:

1. สำหรับงาน `CCTV Terminal Box` จะใช้โมเดล `1 เอกสารต่อ 1 ตู้ต่อเดือน` หรือ `1 เอกสารต่อเดือนที่มีหลายตู้เป็นหลาย item`
2. QR scan จะให้เปิดหน้า history ทันที หรือเปิดหน้าสร้าง checklist ล่าสุดของตู้นั้นได้ด้วย
3. จะให้ `Photo Evidence` บังคับ geolocation หรือไม่
4. จะให้ `Measurement` ที่เกิน threshold auto-NG ทันทีหรือให้เป็น warning ก่อน
5. จะให้ `Target Registry` เป็นเมนูย่อยภายใต้ `Checklist Master Data` หรือแยก route ใหม่

### Recommendation

แนะนำดังนี้:

1. `1 เอกสารต่อ 1 ตู้ต่อเดือน`
2. QR scan เปิด `Asset History` ก่อน แล้วมีปุ่ม `เริ่มตรวจรอบใหม่`
3. geolocation เป็น optional ในเฟสแรก
4. measurement เกินช่วง = auto-NG
5. `Target Registry` อยู่ใต้ `Checklist Master Data` ก่อน เพื่อลดการกระจายเมนู

---

## 18. Deliverable Summary

สถานะ deliverables ตามแผน:

1. ✅ Template Builder ที่ตั้งค่า Checklist ได้ละเอียดจริง
2. ✅ Procedure Plan Editor ที่แก้ Step ได้จริง
3. ⏳ โครงสร้าง Asset-aware Checklist
4. ⏳ QR Code history สำหรับดูย้อนหลังรายอุปกรณ์
5. ⏳ รองรับ use case `CCTV Terminal Box` และขยายต่อไปยัง asset อื่นได้

---

## 19. Recommended Next Document

สถานะเอกสาร/Task ต่อเนื่อง:

1. ✅ [Checklist_Template_Builder_001.md](/C:/Users/Lenovo/dowa-it-system/ai-tasks/tasks/Checklist_Template_Builder_001.md) — Template Builder UX + Save Logic
2. ✅ [Photo_Evidence_Geolocation_003.md](/C:/Users/Lenovo/dowa-it-system/ai-tasks/tasks/Photo_Evidence_Geolocation_003.md) — Optional geolocation สำหรับ Photo Evidence
3. ⏳ [QR_Scan_Navigation_002.md](/C:/Users/Lenovo/dowa-it-system/ai-tasks/tasks/QR_Scan_Navigation_002.md) — QR-scan navigation ไปยัง Asset History และเริ่มรอบตรวจใหม่
4. ⏳ [IMPLEMENTATION_PLAN_TARGET_REGISTRY_QR_ASSET_HISTORY.md](/C:/Users/Lenovo/dowa-it-system/docs/history/IMPLEMENTATION_PLAN_TARGET_REGISTRY_QR_ASSET_HISTORY.md) — แผนหลักสำหรับ Target Registry + QR Asset History phase ถัดไป
