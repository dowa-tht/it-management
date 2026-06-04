# IMPLEMENTATION PLAN: Remote Approve Rebuild (Incident + Checklist)

- Date: 29-May-2026
- Owner: AI Agent (with USER-approved requirements)
- Scope Module: Incident, IT Checklist, Workflow Engine
- Goal: Rebuild Remote Approve flow ให้ใช้ง่ายขึ้นและรองรับ external user ดีขึ้น โดยคง security boundary เดิม

---

## 1) Background & Problem Statement

Remote Approve เดิมมี pain points หลัก:
1. UI/UX รกและลำดับการยืนยันตัวตนไม่ intuitive
2. External user usage ไม่ตอบโจทย์ (discoverability + flow continuity)
3. พฤติกรรมบางส่วนต่างกันระหว่าง Incident/Checklist จนเกิด cognitive load

เป้าหมายการปรับปรุง:
1. ใช้ง่ายขึ้น (ลดความซับซ้อนเชิงสายตาและ interaction)
2. รองรับ external user ดีขึ้น (OTP flow ชัดเจน มี cooldown/countdown)
3. คงความปลอดภัยและ auditability ตามมาตรฐานเดิม

---

## 2) Requirements Baseline (Confirmed)

### 2.1 Functional Scope
1. ใช้กับ 2 หน้า: Incident และ Checklist
2. Remote Approve กดได้เฉพาะ role: `admin`, `it_staff`
3. ใช้ได้เฉพาะสถานะเอกสาร `Pending Approval`
4. ถ้าผู้กดเป็น approver ตัวจริงของ step ให้แสดง/ใช้ปุ่ม Approve ปกติ

### 2.2 Verification Rules
1. Internal step:
- ถ้า step มี `approver_id` เจาะจง -> ใช้ PIN ของ approver คนนั้น
- ถ้า step เป็น role pool (`approver_id = null`) -> แสดงข้อความ Role Pool และใช้ PIN ของ “คนกดปุ่ม”
2. External reporter step:
- ใช้ OTP เท่านั้น
- มีปุ่ม resend OTP
- Cooldown 60 วินาที (ต้องมี countdown)
- จำกัด resend สูงสุด 5 ครั้ง

### 2.3 Signature & UX Rules
1. บังคับลายเซ็นทุกเคส
2. ต้องเป็น “มีเส้นจริง” (ห้ามแตะจุดเดียว)
3. มีปุ่มล้างลายเซ็น
4. ไม่ต้องมีช่อง comment

### 2.4 Two-Step Modal Flow
1. Step Verify:
- แสดงชื่อ-สกุล/อีเมลผู้อนุมัติเป้าหมาย
- ถ้า role pool ให้แสดงข้อความสั้น เช่น `Role Administrator ทั้งหมด`
- กรอก PIN/OTP แล้วกด `ยืนยัน`
2. Step Sign:
- เซ็นชื่อ
- กด `Approve`
- มีปุ่ม `ย้อนกลับ`
- ถ้าย้อนกลับต้องคงค่าที่ verify แล้ว

### 2.5 Success/Error/Audit
1. Success: modal ปุ่มเดียว แสดงข้อความ `อนุมัติเอกสารเลขที่ XXXXX แล้ว` แล้ว refresh
2. Error copy เป็นภาษาไทยทั้งหมด
3. Audit log ต้องเก็บครบ: actor, target approver, verification type, verification result, timestamp
4. ถ้า PIN lock ให้แสดงเวลาปลดล็อก

---

## 3) Non-Functional Constraints

1. ห้าม bypass RLS/authorization rules เดิม
2. ทุก approval action ต้องวิ่งผ่าน workflow action กลาง
3. Reuse component กลาง (ไม่ fork modal คนละ implementation)
4. UI แยกหน้าได้ แต่ business logic verification ต้องใช้ shared function เดียว

---

## 4) Target Architecture

### 4.1 Shared UI Component
- `components/workflow/UnifiedApprovalModal.js`
- เพิ่มโหมด `remote-2step` (Verify -> Sign)
- Props-driven behavior เพื่อใช้ร่วม Incident/Checklist

### 4.2 Shared Server Logic
- ใช้ `submitApprovalStep(...)` เป็น entry หลักต่อไป
- เพิ่ม helper กลางสำหรับ verification pre-check (PIN/OTP + limit/cooldown) เพื่อไม่ duplicated ระหว่างหน้า
- คง sync approver mapping และ authorization guard เดิม

### 4.3 Page Integration
1. Incident page:
- ส่ง props สำหรับ OTP mode (external reporter)
- ส่ง target approver context (specific/role-pool)
2. Checklist page:
- ส่ง props PIN mode (default)
- รองรับ role-pool descriptor

---

## 5) State Machine (Modal)

```text
IDLE
  -> OPEN_VERIFY
OPEN_VERIFY
  -> VERIFYING
VERIFYING
  -> VERIFY_OK -> OPEN_SIGN
  -> VERIFY_FAIL -> OPEN_VERIFY (show error)
OPEN_SIGN
  -> SUBMITTING
  -> OPEN_VERIFY (when back, keep verified state/value)
SUBMITTING
  -> SUCCESS_MODAL
  -> OPEN_SIGN (show submit error)
SUCCESS_MODAL
  -> CLOSE + REFRESH
```

State Data:
1. `verifyMethod`: `pin` | `otp`
2. `verifyValue`: string (retain when back)
3. `verifyPassed`: boolean
4. `verifyContext`: target approver metadata + role pool label
5. `otpCooldownLeft`: number
6. `otpResendCount`: number (max 5)
7. `signatureStrokeCount`: number

---

## 6) Validation Matrix

### 6.1 Verify Step
1. PIN mode:
- ต้องครบ 6 หลัก
- ถ้าผิด -> error ไทย
- ถ้า lock -> แจ้ง lock พร้อมเวลา
2. OTP mode:
- ต้องครบ 6 หลัก
- ตรวจหมดอายุ/ไม่ถูกต้อง
- resend ได้เมื่อ cooldown=0
- resend ไม่เกิน 5 ครั้ง

### 6.2 Sign Step
1. ห้าม submit ถ้า signature empty
2. ห้าม submit ถ้า signature มีเพียงจุดเดียว (no real stroke)
3. ย้อนกลับได้โดยไม่ reset verification value

---

## 7) UI/UX Specification

### 7.1 Verify Screen
1. Header: `อนุมัติแทน (Remote Approve)`
2. Identity Block:
- Specific approver: ชื่อ + อีเมล
- Role pool: แสดง label เช่น `Role Administrator ทั้งหมด`
3. Verification Block:
- Internal: PIN input
- External reporter: OTP input + resend button + countdown + resend counter (`X/5`)
4. Actions: `ยกเลิก`, `ยืนยัน`

### 7.2 Sign Screen
1. Signature pad ใหญ่พอสำหรับ desktop/mobile
2. ปุ่ม `ล้างลายเซ็น`
3. Actions: `ย้อนกลับ`, `Approve`

### 7.3 Success Modal
1. Copy: `อนุมัติเอกสารเลขที่ <doc_no> แล้ว`
2. ปุ่มเดียว `ตกลง`
3. กดแล้ว refresh data + router refresh

---

## 8) Audit Logging Contract

เพิ่ม metadata ใน log/action payload:
1. `actor_user_id`
2. `actor_role`
3. `target_approver_id` (nullable for role-pool when actor PIN)
4. `target_role_pool` (nullable)
5. `verification_type`: `PIN` | `OTP`
6. `verification_result`: `success` | `failed`
7. `is_remote`: true
8. `doc_id`, `doc_type`, `step_id`, `step_order`
9. `timestamp`

หมายเหตุ: ต้องไม่ลบ schema log เดิม ให้เสริมผ่าน `metadata` เพื่อ backward compatibility

---

## 9) Implementation Steps

### Phase A: Shared Modal Refactor
1. เพิ่ม 2-step mode ใน `UnifiedApprovalModal`
2. ตัด comment section ออกใน remote mode ใหม่
3. เพิ่ม signature real-stroke detection
4. เพิ่ม OTP resend UI (countdown + limit)

### Phase B: Shared Action Hardening
1. เพิ่ม helper pre-verify สำหรับ PIN/OTP (ข้อความ error ไทย)
2. ผูก role-pool behavior: PIN ของผู้กด
3. คง authorization checks เดิมใน `submitApprovalStep`
4. เพิ่ม audit metadata fields

### Phase C: Incident Integration
1. map `isExternalReporterStep` -> OTP mode
2. map specific/role-pool identity block
3. แสดงปุ่ม Approve ปกติเมื่อ actor เป็น direct approver

### Phase D: Checklist Integration
1. ผูก modal ใหม่ด้วย flow เดียวกัน
2. รองรับ role-pool identity block
3. ยืนยันเงื่อนไข pending-only และ role guard

### Phase E: Success UX & Refresh
1. สร้าง success modal มาตรฐาน
2. แสดง doc no
3. close -> refresh

### Phase F: Tests & Verification
1. unit test: verification matrix
2. integration test: incident/checklist remote flow
3. edge test: otp cooldown, otp limit, pin lock, signature-point-only
4. run full `npm test`

---

## 10) Error Copy (Thai)

1. `กรุณากรอกรหัส PIN ให้ครบ 6 หลัก`
2. `รหัส PIN ไม่ถูกต้อง`
3. `บัญชีถูกระงับชั่วคราว กรุณาลองใหม่อีกครั้งเวลา <HH:mm>`
4. `กรุณากรอกรหัส OTP ให้ครบ 6 หลัก`
5. `รหัส OTP ไม่ถูกต้องหรือหมดอายุ กรุณาขอรหัสใหม่`
6. `ส่งรหัส OTP ใหม่ได้อีกครั้งใน <ss> วินาที`
7. `คุณส่ง OTP ครบจำนวนสูงสุดแล้ว (5 ครั้ง)`
8. `กรุณาเซ็นชื่อให้เป็นลายเซ็นที่สมบูรณ์`
9. `ไม่พบสิทธิ์การอนุมัติสำหรับขั้นตอนนี้`
10. `ขั้นตอนนี้ยังไม่พร้อมสำหรับการอนุมัติ`

---

## 11) Risks & Mitigations

1. Risk: role-pool ambiguity
- Mitigation: explicit label + actor PIN policy
2. Risk: OTP spam
- Mitigation: cooldown 60s + max 5
3. Risk: regression ระหว่าง Incident/Checklist
- Mitigation: shared component + shared server logic + integration tests ทั้งสองหน้า
4. Risk: audit inconsistency
- Mitigation: บันทึก metadata กลางใน action เดียว

---

## 12) Rollout Strategy

Deploy พร้อมกันทั้ง Incident + Checklist (single release) โดย:
1. Feature parity checklist ก่อน merge
2. QA matrix ครบสองโมดูล
3. release note ระบุ behavior ใหม่ของ remote 2-step

---

## 13) Acceptance Criteria

1. ผู้ใช้ `admin/it_staff` เปิด remote modal ได้เฉพาะ pending
2. Internal specific approver ต้องผ่าน PIN approver
3. Internal role-pool ต้องผ่าน PIN ผู้กด
4. External reporter ต้องผ่าน OTP เท่านั้น
5. OTP cooldown 60 วินาที + limit 5 ใช้งานได้จริง
6. ลายเซ็นต้องเป็นเส้นจริงทุกเคส
7. success modal แสดงเลขเอกสารและ refresh ได้
8. audit log มี metadata ครบตาม contract
9. Incident และ Checklist ใช้ flow เดียวกัน
10. `npm test` ผ่าน 100%

---

## 14) Out of Scope

1. เปลี่ยน RBAC role model
2. เปลี่ยนโครงสร้างฐานข้อมูลหลักนอกเหนือ metadata log ที่จำเป็น
3. เปลี่ยน approval lifecycle อื่นที่ไม่ใช่ Remote Approve

---

## 15) Deliverables

1. Updated shared modal component
2. Updated shared workflow action logic
3. Incident integration changes
4. Checklist integration changes
5. Tests (unit + integration)
6. Documentation updates (INDEX, CHANGELOG)

---

End of Plan
