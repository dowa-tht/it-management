# 🛡️ แผนการ Refactor: เสริมความแข็งแกร่งระบบ User Management (Hardening)

เอกสารฉบับนี้จัดทำขึ้นเพื่อยกระดับความปลอดภัยและระบบตรวจสอบ (Audit) ของโมดูลจัดการผู้ใช้ให้เป็นไปตามมาตรฐานสูงสุด

---

## 🎯 วัตถุประสงค์ (Goals)
1.  **Admin Accountability**: บันทึกทุกความเคลื่อนไหวที่เกิดขึ้นโดยผู้ดูแลระบบ (Role Change, Delete, Unlock)
2.  **Auto-Enforcement**: ระบบต้องปิดบัญชี Guest โดยอัตโนมัติเมื่อครบกำหนด 3 วัน (หรือตามที่ระบุใน `expires_at`)
3.  **Server-side Security**: ย้ายระบบป้องกันการเดา PIN (Lockout) ไปไว้ที่ Server-side 100%

---

## 📂 รายละเอียดการแก้ไข (Implementation Details)

### 1. ระบบบันทึก Log ผู้ดูแลระบบ (Admin Audit Logs)
- **ไฟล์**: `app/actions/admin.js`
- **การแก้ไข**: 
    - สร้างฟังก์ชัน `recordAdminAction(targetUserId, action, details)` สำหรับบันทึกลงตาราง `admin_audit_logs` (หรือตารางกลาง)
    - เพิ่มการเรียกฟังก์ชันนี้ใน:
        - `createAdminUser`: Log เมื่อมีการสร้างผู้ใช้ใหม่
        - `updateAdminUser`: Log เมื่อมีการเปลี่ยน Role หรือสถานะ Active (ระบุ Old Value -> New Value)
        - `secureCleanDeleteUser`: Log ก่อนที่จะลบข้อมูลออกจากระบบ
        - `updateAdminUserPin` & `unlockUserPin`: Log เมื่อมีการยุ่งเกี่ยวกับความปลอดภัย

### 2. ระบบปิดบัญชี Guest อัตโนมัติ (Guest Auto-Deactivate)
- **ทางเลือกที่ 1 (Database Trigger)**: สร้าง Postgres Trigger ตรวจสอบ `expires_at` ทุกครั้งที่มีการ Login
- **ทางเลือกที่ 2 (Middleware/Server Action)**: ในฟังก์ชัน `getCurrentUserSession` ให้เพิ่มการเช็คว่า `role === 'guest' && expires_at < now()` หรือไม่ หากใช่ให้เปลี่ยน `is_active = false` ทันที

### 3. การย้าย PIN Lockout ไปยัง Server-side
- **ไฟล์**: `app/actions/auth.js` (Unified Login)
- **การแก้ไข**:
    - เมื่อกรอก PIN ผิด: แทนที่จะนับใน State ของ React ให้เรียก Server Action เพื่อเพิ่ม `pin_attempts` ในตาราง `user_profiles`
    - หาก `pin_attempts >= 5`: ให้ตั้งค่า `pin_locked_until = now() + 30 minutes`
    - หน้า Login จะตรวจสอบ `pin_locked_until` จาก Server ก่อนอนุญาตให้กรอก PIN ครั้งถัดไป

---

## 📝 ขั้นตอนการทำงานสำหรับ Agent (Developer Instructions)

### Step 1: สร้างตาราง Audit (หากยังไม่มี)
ตรวจสอบว่ามีตารางที่รองรับการเก็บ Log ของ Admin หรือยัง หากไม่มีให้เสนอการสร้างตาราง `admin_audit_logs`

### Step 2: อัปเดต Admin Actions
ไล่แก้ฟังก์ชันใน `admin.js` โดยเน้นที่การทำ Transactional Write (บันทึกข้อมูลหลัก + บันทึก Log)

### Step 3: เสริม Security ใน Auth Flow
แก้ไข `unifiedLogin` ให้มีการตรวจสอบสถานะ Lockout จาก Database ก่อนเสมอ

---

## ✅ การตรวจสอบผลงาน (Verification)
1.  **Audit Check**: ลองเปลี่ยน Role ผู้ใช้ แล้วตรวจสอบว่ามี Log ปรากฏในฐานข้อมูลหรือไม่ (พร้อมระบุชื่อ Admin ผู้กระทำ)
2.  **Lockout Check**: ลองกรอก PIN ผิด 5 ครั้ง แล้วรีเฟรชหน้าจอ (Hard Refresh) ระบบต้องยังคงบล็อกไม่ให้กรอกต่อจนกว่าจะครบเวลาหรือ Admin ปลดล็อกให้
3.  **Guest Check**: ลองตั้งวันหมดอายุของ Guest ให้เป็นอดีต แล้วลอง Login ระบบต้องไม่อนุญาตให้เข้าใช้งาน

---
*จัดทำแผนโดย: Project Checker (DOWA IT System)*
*วันที่: 08-May-2026*
