# Procedure Plan Step Fields Implementation Plan

## Module Boundary
- Module: IT Checklist / Settings
- Primary files in scope:
  - `lib/procedurePlanValidation.js`
  - `app/dashboard/settings/procedure-plan-editor/ProcedurePlanEditorClient.js`
  - `app/actions/procedure-plan.js`
- Secondary validation/test scope if needed:
  - `tests/*` files related to procedure plan validation

## Confirmed Requirement

เพิ่มฟิลด์ใหม่ในแต่ละ Procedure Step ดังนี้:
1. ผู้รับผิดชอบ — เป็นข้อความอิสระ
2. เกณฑ์วัดผลการซ้อม — เป็น textarea หลายบรรทัด
3. เวลาการดำเนินการ — optional, รับจาก UI แบบ ชั่วโมง:นาที
4. วิธีประเมินผล — ใช้ field ใหม่แยกจาก `step_type`
5. รองรับการกำหนดเกณฑ์ `min/max` ตั้งแต่รอบนี้

## Design Principle

ต้องแยก 2 แนวคิดออกจากกันชัดเจน:

- `step_type` = ชนิดของกิจกรรมหรือชนิด input
  - ตัวอย่าง: `check`, `photo`, `measure`, `text`, `link`
- `evaluation_mode` = วิธีตัดสินผลของ step
  - ตัวอย่าง: `ok_ng`, `text_only`, `numeric_range`, `manual_review`

ห้ามใช้ `step_type` แทนการประเมินผล เพราะจะทำให้ data model ผูกกันแน่นเกินไปและขยายยาก

## Target Step Data Model

```js
{
  step_no: 1,
  title: '',
  instruction: '',
  owner_name: '',
  success_criteria: '',
  duration_minutes: null,
  step_type: 'check',
  required: true,
  evaluation_mode: 'ok_ng',
  evaluation_config: {
    min_value: null,
    max_value: null,
    expected_text: '',
    allow_na: false,
  },
  evidence_rule: {
    photo_required: false,
    note_required: false,
  },
}
```

## Technical Mapping Rule

### 1. User input for duration
- UI รับค่าแบบ `HH:mm`
- ก่อน save ให้แปลงเป็น `duration_minutes`
- ตอนโหลดกลับเข้า editor ให้แปลง `duration_minutes` กลับเป็น `HH:mm`

### 2. Evaluation mode behavior

ค่าที่แนะนำสำหรับรอบนี้:
- `ok_ng`
- `text_only`
- `numeric_range`
- `manual_review`

### 3. Evaluation config behavior

ใช้ logic ดังนี้:

```text
if evaluation_mode = ok_ng
  evaluation_config.min_value = null
  evaluation_config.max_value = null
  evaluation_config.expected_text = ''

if evaluation_mode = text_only
  evaluation_config.min_value = null
  evaluation_config.max_value = null
  evaluation_config.expected_text = optional text

if evaluation_mode = numeric_range
  show min_value input
  show max_value input
  validate at least one of min_value or max_value exists

if evaluation_mode = manual_review
  keep config minimal
```

## File-by-File Implementation Plan

### A. `lib/procedurePlanValidation.js`

#### A1. Extend constants
- เพิ่ม evaluation mode constant เช่น:

```js
export const PROCEDURE_EVALUATION_MODES = ['ok_ng', 'text_only', 'numeric_range', 'manual_review']
```

#### A2. Extend `procedureStepSchema`
- เพิ่ม field:
  - `owner_name`
  - `success_criteria`
  - `duration_minutes`
  - `evaluation_mode`
  - `evaluation_config`

#### A3. Extend normalization
ใน [`normalizeProcedurePlanSteps`](lib/procedurePlanValidation.js)
- map ค่าใหม่ทั้งหมด
- sanitize `duration_minutes` ให้เป็น number หรือ `null`
- sanitize `evaluation_config.min_value` และ `evaluation_config.max_value`

#### A4. Add conditional validation
- ถ้า `evaluation_mode = numeric_range`
  - ต้องมี `min_value` หรือ `max_value` อย่างน้อย 1 ค่า
  - ถ้ามีทั้งคู่และ `min_value > max_value` ให้ error
- ถ้า `evaluation_mode != numeric_range`
  - `min_value` และ `max_value` ต้องถูก normalize กลับเป็น `null`

#### A5. Normalize output contract
ผลลัพธ์จาก [`validateProcedurePlanInput()`](lib/procedurePlanValidation.js) ต้องคืน data ใหม่ครบทุก field เพื่อให้ server action ใช้ได้ทันที

### B. `app/dashboard/settings/procedure-plan-editor/ProcedurePlanEditorClient.js`

#### B1. Extend empty step factory
ใน `createBlankStep()`
- เพิ่ม default fields:
  - `owner_name: ''`
  - `success_criteria: ''`
  - `duration_minutes: null`
  - `evaluation_mode: 'ok_ng'`
  - `evaluation_config: { min_value: null, max_value: null, expected_text: '', allow_na: false }`

#### B2. Add UI helpers
เพิ่ม helper logic ในไฟล์นี้สำหรับ:
- `formatMinutesToTimeInput()`
- `parseTimeInputToMinutes()`
- `updateEvaluationConfig()`

#### B3. Extend editor UI
เพิ่ม field ต่อจาก `Instruction`:
- `ผู้รับผิดชอบ` — text input
- `เกณฑ์วัดผลการซ้อม` — textarea
- `เวลาการดำเนินการ` — input แบบ `HH:mm`
- `วิธีประเมินผล` — select

#### B4. Conditional evaluation UI
ถ้า `evaluation_mode = numeric_range`
- แสดง input `ค่าต่ำสุด min`
- แสดง input `ค่าสูงสุด max`

ถ้า `evaluation_mode = text_only`
- อาจแสดง `expected_text` เป็น optional helper field ได้ แต่ถ้ายังไม่จำเป็นรอบนี้ให้คง config ว่างไว้ก่อน

#### B5. Save payload transformation
ก่อนเรียก [`saveProcedurePlan()`](app/actions/procedure-plan.js)
- แปลงค่าช่องเวลา `HH:mm` -> `duration_minutes`
- cleanup config ตาม `evaluation_mode`

#### B6. Preview alignment
ใน preview modal ควรเพิ่มการแสดง:
- ผู้รับผิดชอบ
- เกณฑ์วัดผลการซ้อม
- เวลาการดำเนินการ
- วิธีประเมินผล
- min/max เมื่อเป็น numeric range

### C. `app/actions/procedure-plan.js`

#### C1. Ensure server action accepts new structure
- ตรวจว่าฝั่ง save ไม่ strip fields ใหม่ทิ้ง
- ให้ persist `steps` JSON พร้อม field ใหม่ทั้งหมด

#### C2. Ensure formatter returns new structure
- ตอน load กลับจากฐานข้อมูลต้องคืนค่า fields ใหม่ครบเพื่อให้ editor ใช้งานต่อได้

## UX Structure for Step Editor

ให้คง pattern ที่ปรับล่าสุดไว้ แล้วเพิ่ม field ใหม่ใน detail pane เท่านั้น

ลำดับ UI ภายใน detail pane:
1. ชื่อขั้นตอน
2. ชนิดขั้นตอน
3. Required step
4. Instruction
5. ผู้รับผิดชอบ
6. เกณฑ์วัดผลการซ้อม
7. เวลาการดำเนินการ
8. วิธีประเมินผล
9. min/max ถ้าเป็น numeric range
10. Evidence rules

## Execution-Ready Output Contract

เมื่อ procedure plan ถูกนำไปใช้จริง หน้าจอ execution ควรอ่านข้อมูลตามนี้:

| สิ่งที่แสดง | field |
|---|---|
| ลำดับ | `step_no` |
| ชื่อขั้นตอน | `title` |
| ขั้นตอนการดำเนินการ | `instruction` |
| ผู้รับผิดชอบ | `owner_name` |
| เกณฑ์วัดผลการซ้อม | `success_criteria` |
| เวลาการดำเนินการ | `duration_minutes` |
| วิธีประเมินผล | `evaluation_mode` |
| เกณฑ์ min/max | `evaluation_config.min_value`, `evaluation_config.max_value` |

## Validation Cases to Cover

ต้องมี test อย่างน้อยตามนี้:

1. รับ `owner_name` และ `success_criteria` ได้
2. รับ `duration_minutes = null` ได้
3. รับ `duration_minutes` เป็นเลขจำนวนเต็มได้
4. `evaluation_mode = ok_ng` ผ่านได้
5. `evaluation_mode = numeric_range` ผ่านเมื่อมี min หรือ max อย่างน้อย 1 ค่า
6. `evaluation_mode = numeric_range` fail เมื่อไม่มี min/max ทั้งคู่
7. fail เมื่อ `min_value > max_value`
8. normalize step เก่าที่ยังไม่มี field ใหม่ให้ backward compatible

## Backward Compatibility Rule

ข้อมูล procedure plan เก่าที่ไม่มี field ใหม่ต้องยังเปิดแก้ไขได้

logic:

```text
if field ใหม่ไม่มีอยู่ใน record เดิม
  owner_name = ''
  success_criteria = ''
  duration_minutes = null
  evaluation_mode = 'ok_ng'
  evaluation_config = default object
```

## Risk Notes

- งานนี้เป็น Standard tier ที่กระทบ data contract ของ procedure steps
- แม้ยังไม่แตะ migration schema โดยตรง แต่ต้องระวัง compatibility ของ JSON `steps`
- ห้ามออกแบบให้ UI derive `evaluation_mode` จาก `step_type` แบบ hardcode เพราะจะย้อนกลับมาแก้ยาก

## Recommended Execution Order

1. แก้ [`lib/procedurePlanValidation.js`](lib/procedurePlanValidation.js)
2. แก้ [`app/actions/procedure-plan.js`](app/actions/procedure-plan.js)
3. แก้ [`app/dashboard/settings/procedure-plan-editor/ProcedurePlanEditorClient.js`](app/dashboard/settings/procedure-plan-editor/ProcedurePlanEditorClient.js)
4. แก้ preview UI
5. เพิ่ม/อัปเดต tests
6. รัน [`npm test`](package.json)

## Ready-for-Implementation Summary

แผนนี้ยึด requirement ที่ยืนยันแล้วครบทั้งหมด และออกแบบให้:
- รองรับการใช้งานรอบนี้ทันที
- รองรับ execution screen ในอนาคต
- ไม่ผูก `step_type` กับวิธีประเมินผล
- ยังเปิดข้อมูลเก่าได้โดยไม่พัง
