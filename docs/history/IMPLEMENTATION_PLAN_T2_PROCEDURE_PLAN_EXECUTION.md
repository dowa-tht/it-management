# T2 Procedure Plan Execution Enhancement Plan

## Module Boundary
- Module: IT Checklist
- Execution UI scope: [`app/dashboard/checklist/[id]/page.js`](app/dashboard/checklist/[id]/page.js)
- Setup UI scope: [`app/dashboard/settings/procedure-plan-editor/ProcedurePlanEditorClient.js`](app/dashboard/settings/procedure-plan-editor/ProcedurePlanEditorClient.js)
- Validation/test scope: [`lib/procedurePlanValidation.js`](lib/procedurePlanValidation.js), [`tests/target-registry.test.js`](tests/target-registry.test.js)

## Confirmed Requirement
สำหรับ Checklist document ที่ใช้ T2 Procedure Plan ต้องปรับดังนี้:
1. เพิ่มช่องระบุวันและเวลาเริ่มจับเวลาการฝึกซ้อมใน section รายการตรวจสอบ
2. แสดงข้อมูลครบทุกลำดับของ procedure step ได้แก่ ชื่อขั้นตอน, Instruction, ผู้รับผิดชอบ, เวลาการดำเนินการ, เกณฑ์วัดผลการซ้อม และปุ่ม OK/NG ในทุกบรรทัด
3. เวลาการดำเนินการต้องกรอกได้ที่หน้าปฏิบัติงานจริง แล้วรวมเวลาเพื่อสรุปเวลารวมและเวลาเสร็จสิ้น
4. เอาช่อง `เวลาการดำเนินการ (ชั่วโมง:นาที)` ออกจากหน้า Setup → Master Data → Procedure Plans เพื่อไม่ให้กำหนดจาก master

## Evidence from Current Source
- [`ProcedureTemplate()`](app/dashboard/checklist/[id]/page.js:1040) ปัจจุบันโหลดขั้นตอนแล้ว render แค่ checkbox toggle รายบรรทัด ยังไม่แสดง metadata ของแต่ละ step และยังไม่มี time-tracking input
- รายการ checklist หลักใน [`items.map()`](app/dashboard/checklist/[id]/page.js:417) มี card wrapper ที่สามารถเพิ่ม start datetime summary ของ T2 ได้ใน section เดียวกัน
- หน้า setup ใน [`ProcedurePlanEditorClient`](app/dashboard/settings/procedure-plan-editor/ProcedurePlanEditorClient.js:1176) ยังมี input `เวลาการดำเนินการ (ชั่วโมง:นาที)` อยู่ใน detail pane
- validation layer ใน [`createBlankStep()`](app/dashboard/settings/procedure-plan-editor/ProcedurePlanEditorClient.js:10) และ [`baseProcedureStepSchema`](lib/procedurePlanValidation.js:25) ยังรองรับ `duration_minutes` เพื่อ backward compatibility ได้ แม้จะเลิกแก้จาก setup UI

## Technical Design

### 1. Execution data contract
เก็บข้อมูลใน `item.template_data` เพิ่ม key สำหรับ T2 execution:

```js
{
  ...existingData,
  started_at: '2026-05-22T09:30',
  step_results: {
    0: {
      status: 'OK' | 'NG' | null,
      duration_minutes: 15,
      completed_at: '2026-05-22T09:45:00.000Z'
    }
  }
}
```

- `started_at` ใช้ค่าจาก `<input type="datetime-local">`
- `step_results[index].duration_minutes` มาจาก input แบบ `HH:mm`
- `completed_at` คำนวณจาก `started_at + sum(duration_minutes up to current step)` เพื่อใช้แสดงผลสรุปโดยไม่ต้องเพิ่ม schema

### 2. Rendering rule for each step
ทุก step ต้อง render block เดียวกันเสมอ:
- ซ้าย: ลำดับ + ชื่อขั้นตอน + instruction + owner + success criteria
- กลาง: input เวลาการดำเนินการจริงแบบ `HH:mm`
- ขวา: ปุ่ม `OK` และ `NG` เฉพาะ step นั้น

ห้ามซ่อนแถวที่ไม่มีค่า metadata; ถ้า field ว่างให้แสดง `—` เพื่อให้ layout และ checklist ครบทุกบรรทัด

### 3. Summary rule
คำนวณค่า derived ใน client:
- `totalDurationMinutes = Σ step_results[*].duration_minutes`
- `finishedAt = started_at ? new Date(started_at + totalDurationMinutes)` : null
- แสดงใน header/summary ของ procedure card ว่า
  - เริ่มจับเวลา: datetime
  - ใช้เวลารวม: `HH:mm`
  - เสร็จสิ้นเวลา: datetime

### 4. Setup rule change
ในหน้า setup ให้ถอดเฉพาะ input field ของ `duration_minutes` ออกจาก detail editor และ preview text ของ field นี้ เพื่อบังคับให้เวลาจริงเกิดจาก execution เท่านั้น

## Implementation Steps
1. เพิ่ม helper สำหรับ parse/format เวลาใน [`app/dashboard/checklist/[id]/page.js`](app/dashboard/checklist/[id]/page.js) เพื่อแปลง `HH:mm` และสรุปเวลารวม
2. refactor [`ProcedureTemplate()`](app/dashboard/checklist/[id]/page.js:1040) ให้ใช้ `step_results` แทน checkbox map เดิม พร้อม start datetime, per-step duration, per-step OK/NG, total summary และ finish time
3. ปรับ logic update ของ T2 ให้เรียก [`onUpdate()`](app/dashboard/checklist/[id]/page.js:1040) ด้วย payload ใหม่แต่ยังไม่กระทบ template type อื่น
4. ถอด input `duration_minutes` และ preview line ออกจาก [`ProcedurePlanEditorClient`](app/dashboard/settings/procedure-plan-editor/ProcedurePlanEditorClient.js:1176) และ [`ProcedurePlanEditorClient`](app/dashboard/settings/procedure-plan-editor/ProcedurePlanEditorClient.js:1303)
5. เพิ่ม tests ใน [`tests/target-registry.test.js`](tests/target-registry.test.js) เพื่อยืนยันว่า [`validateProcedurePlanInput()`](lib/procedurePlanValidation.js:126) ยัง normalize step เก่าที่ไม่มี `duration_minutes` ได้ และรับ step metadata ที่จำเป็นของ T2 ได้

## Backward Compatibility
- Procedure plan เก่ายังมี `duration_minutes` อยู่ใน JSON ได้ แต่ execution UI จะไม่พึ่งค่า master นี้เป็น source-of-truth
- ถ้า `item.template_data.steps` แบบเก่ายังมีอยู่ ให้ migrate อ่าน fallback เป็น `step_results` ว่าง เพื่อไม่ทำให้เอกสารเก่า crash

## Verification Plan
- รัน targeted test ผ่าน [`npm test -- --test-name-pattern="ProcedurePlan|normalizeProcedurePlanSteps"`](package.json)
- รัน [`npm run lint`](package.json) เพื่อเช็ก JSX/React hooks ในไฟล์ checklist + settings
- อ่านไฟล์จริงหลังแก้ไขเพื่อยืนยันว่าหน้า setup ไม่มี input เวลาการดำเนินการแล้ว และหน้า execution มี start datetime + per-step fields ครบ
