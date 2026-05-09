# Changelog Archive - 2026-04-30

### [2026-04-30] - Vercel Production Stability & Action Restructuring
- **Login Reliability Fix (Vercel):** แก้ไขปัญหา Login ไม่ได้บน Vercel Production โดยการเปลี่ยนจากการใช้ Server Action มาเป็น **API-based Auth (`/api/auth/check-tier`)** เพื่อความเสถียรสูงสุด
- **Action Restructuring:** แยกไฟล์ Server Action ออกเป็นส่วนๆ เพื่อลดปัญหา Dependency Conflict บน Serverless Environment:
  - `status.js`: ตรวจสอบประเภทผู้ใช้ (Native Fetch)
  - `login.js`: จัดการการเข้าสู่ระบบ (Isolated Bcrypt)
  - `user.js`: จัดการ Session และข้อมูล Profile
- **Infrastructure Security:** เพิ่มหน้า **System Diagnostic (`/debug-env`)** สำหรับตรวจสอบสถานะ Environment Variables บน Vercel โดยไม่เปิดเผยค่าความลับ
- **Auth Hardening:** เพิ่มระบบดักจับ Error และตรวจสอบตัวแปรสภาพแวดล้อมก่อนเริ่มทำงาน เพื่อป้องกันปัญหา Error 500
- **Test User Sync:** กู้คืนและซิงค์บัญชี `Antigravity` (exam@123.com) ให้สามารถใช้งานบนระบบจริงได้สำหรับการทดสอบ
- **Backup Functionality Fix:** แก้ไข Bug ฟังก์ชัน Backup Log ที่บันทึก/ลบข้อมูลไม่ได้ และแก้ไขปัญหา Timezone ที่ซ่อนข้อมูลวันสุดท้ายของเดือน
- **UI Auto-Refresh:** เพิ่มระบบ Auto-refresh (ทุก 5 นาที) ในหน้า Dashboard และ Backup Log เพื่อให้ข้อมูลอัปเดตตลอดเวลาโดยไม่ต้องรีเฟรชหน้าจอเอง
- **Numeric Date Formatting:** เพิ่มฟังก์ชัน `formatDateNumeric` เพื่อแสดงผลวันที่ในรูปแบบ `dd/mm/yyyy` และนำไปใช้ในหน้า SLA Compliance Dashboard ทั้งส่วนฟิลเตอร์และตารางรายการ

---
*ย้ายข้อมูลเมื่อ 08-May-2026*
