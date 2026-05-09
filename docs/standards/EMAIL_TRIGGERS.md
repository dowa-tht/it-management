# 📧 มาตรฐานการส่งอีเมลและรายการ Trigger (Email Trigger Standards)

เอกสารฉบับนี้รวบรวมรายการส่งอีเมลทั้งหมดในระบบ DOWA IT เพื่อใช้ในการตรวจสอบและควบคุมมาตรฐานการสื่อสารกับผู้ใช้

---

## 📋 รายการ Email Triggers ทั้งหมด

| ลำดับ | หน้าจอ / เมนู (Screen) | Trigger / Action | วัตถุประสงค์ (Purpose) | ขั้นตอนที่ส่ง (Step) | เนื้อหาเมล (Content) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | `Settings > Users` | **Create User (Invite)** | เชิญผู้ใช้ใหม่เข้าสู่ระบบ | เมื่อ Admin เพิ่ม User ใหม่ | ลิงก์ Onboarding (Self-Registration) |
| **2** | `Incidents > New` | **Quick Add User** | ยืนยันตัวตนผู้แจ้งด่วน | เมื่อ IT เพิ่มชื่อผู้แจ้งแบบด่วน | ลิงก์ Onboarding (Self-Registration) |
| **3** | `Incident Detail` (Modal) | **Request Signature OTP** | ยืนยันการลงนามเอกสาร | เมื่อกดขอ OTP ใน Signature Modal | รหัส OTP 6 หลัก (อายุ 30 นาที) |
| **4** | `Login Page` | **Account Recovery** | กู้คืนความปลอดภัยบัญชี | เมื่อกด "ลืมรหัสผ่าน/PIN" | ลิงก์ Reset PIN หรือ OTP กู้คืนรหัสผ่าน |
| **5** | `Recovery / Settings` | **Password Change OTP** | ยืนยันการเปลี่ยนรหัสผ่าน | ขั้นตอนสุดท้ายก่อนยืนยันเปลี่ยนรหัส | รหัส OTP 6 หลัก (อายุ 5 นาที) |

---

## 🛡️ มาตรฐานความปลอดภัยของอีเมล (Security Standards)

1.  **Expiration Policy**: 
    -   รหัส OTP ทุกประเภทต้องหมดอายุภายในไม่เกิน **30 นาที**
    -   ลิงก์ Onboarding หรือลิงก์กู้คืนข้อมูลสำคัญต้องหมดอายุภายใน **24 ชั่วโมง**
2.  **Zero-Password Delivery**: ห้ามส่งรหัสผ่าน (Plain Text) ผ่านทางอีเมลโดยเด็ดขาด ให้ใช้ระบบ Secure Link หรือ OTP แทนเท่านั้น
3.  **Audit Trail**: ทุกครั้งที่มีการส่งอีเมลสำคัญ (เช่น Recovery) ระบบควรบันทึก Log การส่งลงในระบบ (System Logs) เพื่อการตรวจสอบย้อนกลับ
4.  **Honeypot Support**: ระบบ Login และ Recovery ต้องมี Bot Trap เพื่อป้องกันการใช้ Script สั่งส่งอีเมลจำนวนมาก (Spamming)

---
*จัดทำโดย: Project Checker (DOWA IT System)*
*อัปเดตล่าสุด: 08-May-2026*
