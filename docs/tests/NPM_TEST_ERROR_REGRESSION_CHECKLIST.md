# npm test Error Regression Checklist (Updated)

## Scope
- ตรวจสอบเคส regression จาก `tests/incident-otp-flow.test.js`
- อัปเดตตามผลล่าสุด: ผ่านแล้ว 1 เคส, เหลือ fail 3 เคส
- เน้นเช็คพฤติกรรมปลายทางให้เห็นผลจริงก่อนรันเทสซ้ำ

## Pre-check
- [ ] เปิดระบบได้ตามปกติ (หน้า Incident / Approval / User Management)
- [ ] มีบัญชีทดสอบที่ใช้ทดสอบ flow OTP และ approval
- [ ] มีเคส Incident สำหรับทดลองอนุมัติอย่างน้อย 1 เคส

## Baseline ล่าสุด (28-May-2026)
- [ ] รัน `npm test` และยืนยันผลรวม: 16 tests / pass 13 / fail 3
- [ ] ยืนยันว่าเคส `new incident page persists reporter_email...` ผ่านแล้ว

## 1) Incident Form เก็บข้อมูลอีเมลผู้แจ้ง (สถานะ: ผ่านแล้ว)
- [ ] เข้าหน้า New Incident และเลือกผู้แจ้งจากช่องค้นหา
- [ ] หลังเลือกผู้แจ้ง ระบบต้องผูกอีเมลผู้แจ้งไว้กับข้อมูลเคส
- [ ] เปลี่ยนผู้แจ้งใหม่แล้วข้อมูลผู้แจ้งเดิมไม่ค้างผิดคน
- [ ] กดบันทึกเคสใหม่แล้วไม่เกิด error `reporter_email is null`

## 2) Approval Modal ส่ง OTP ให้ผู้อนุมัติถูกคน (สถานะ: ยัง fail)
- [ ] เปิดหน้าที่มีปุ่มส่ง OTP ใน modal อนุมัติ
- [ ] กดส่ง OTP แล้วต้องส่งไปยังผู้อนุมัติที่เลือกอยู่จริง
- [ ] ไม่เกิดกรณีส่ง OTP สลับผู้ใช้หรือส่งไป user ว่าง
- [ ] โครงสร้าง modal ต้องมี flow เรียก `requestApprovalOTP` พร้อม identity context ของ approver

## 3) ระบบบันทึกวิธีอนุมัติ (Approval Method) (สถานะ: ยัง fail)
- [ ] ทดลองอนุมัติแบบ PIN
- [ ] ทดลองอนุมัติแบบ OTP
- [ ] หลังจบแต่ละแบบ ต้องตรวจสอบได้ว่า log/รายละเอียดอนุมัติแยกวิธีได้ถูกต้อง
- [ ] ตรวจสอบว่า workflow ส่ง metadata วิธีอนุมัติชัดเจนทุกกรณี (direct/pin/otp)

## 4) Legacy Quick Add User ถูกปิดใช้งาน (สถานะ: ยัง fail)
- [ ] ทดลอง flow Quick Add User แบบเดิม
- [ ] ระบบต้องบล็อกการสร้างบัญชีถาวรแบบเดิม
- [ ] ผู้ใช้เห็นข้อความแจ้งชัดเจนว่า flow นี้ถูกปิดใช้งานแล้ว
- [ ] ตรวจสอบว่าข้อความปิดใช้งานตรงตามข้อความมาตรฐานที่ test ตรวจ

## Close-out
- [ ] รัน `npm test` ซ้ำแล้วทุกเคสในไฟล์ `tests/incident-otp-flow.test.js` ผ่าน
- [ ] ยืนยันว่าไม่มีผลข้างเคียงกับ workflow ปกติของ Incident/Approval
