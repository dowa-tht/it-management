# 📘 DOWA IT System - Technical Documentation (Multi-Tier RBAC)

เอกสารฉบับนี้สรุปโครงสร้างระบบบริหารจัดการผู้ใช้ (User Management) และการรักษาความปลอดภัยที่มีการแบ่งเป็น 4 ระดับ (Tiers) เพื่อใช้เป็นมาตรฐานในการพัฒนาและแก้ไขระบบ

---

## 1. Data Structure & Relations (โครงสร้างฐานข้อมูล)

ระบบใช้ฐานข้อมูล Supabase โดยแบ่งการจัดเก็บผู้ใช้เป็น 2 ประเภทหลักที่เชื่อมโยงกันด้วย **Email** ผ่านตารางกลาง (Bridge Table)

### 🧩 ตารางหลัก
| ตาราง | ประเภทผู้ใช้ | การพิสูจน์ตัวตน (Auth) | ฟิลด์สำคัญ |
| :--- | :--- | :--- | :--- |
| `user_profiles` | **Internal (Staff)** | Supabase Auth (Password) | `id` (Link to Auth.users), `full_name` |
| `external_users` | **External (Guest)** | Custom PIN (Bcrypt Hash) | `id`, `email`, `pin_hash`, `expires_at` |
| `user_registry` | **ตารางกลาง (Bridge)** | - | `email` (PK), `user_role`, `internal_user_id`, `external_user_id` |

### 🔗 ความสัมพันธ์ (Data Mapping)
- **Source of Truth:** ตาราง `user_registry` คือจุดที่ระบุว่า Email นี้มีบทบาท (Role) อะไร และเชื่อมไปยังตารางไหน
- **Internal Mapping:** `user_registry.internal_user_id` <-> `user_profiles.id`
- **External Mapping:** `user_registry.external_user_id` <-> `external_users.id`

---

## 2. Role Standards (มาตรฐานสิทธิ์การใช้งาน)

เพื่อให้ระบบทำงานร่วมกันได้ทุกส่วน เราได้กำหนดค่ามาตรฐานของ Role ไว้ดังนี้:

| Tier | Standard Role Name | หน้าที่ / สิทธิ์ | ระบบ Login |
| :---: | :--- | :--- | :--- |
| **1** | `administrator` | ดูแลระบบทั้งหมด, จัดการ User | Password |
| **2** | `supervisor` | ดูแลเคส, ออกรายงาน | Password |
| **3** | `approval` | ผู้อนุมัติ (ภายนอก) | 6-Digit PIN |
| **4** | `guest` | ผู้เข้าชม / ผู้แจ้ง (ภายนอก) | 6-Digit PIN |

> [!IMPORTANT]
> **Normalization:** ระบบใช้ฟังก์ชัน `normalizeRole()` ใน `lib/auth.js` เพื่อแปลงค่าเก่า (เช่น `superuser` -> `administrator`, `visitor` -> `guest`) ให้เป็นมาตรฐานเดียวกันก่อนแสดงผลหรือเช็คสิทธิ์

---

## 3. Module & Function Mapping (ตำแหน่งของฟังก์ชัน)

### 🛡️ Admin Operations (การจัดการโดย Admin)
**File Path:** `app/actions/admin.js`
- `createAdminUser`: สร้างผู้ใช้ใหม่ (แยก Logic ตาม Tier)
- `updateAdminUser`: แก้ไขข้อมูลทั่วไป/สถานะ Active
- `updateAdminUserPassword`: Reset รหัสผ่านให้ Staff (Internal)
- `updateAdminUserPIN`: Reset PIN 6 หลักให้ Guest/Approval (External)

### 🔑 Authentication & Self-Service (การเข้าสู่ระบบและจัดการตนเอง)
**File Path:** `app/actions/auth.js`
- `unifiedLogin`: ระบบ Login ตัวเดียวที่เช็คทั้ง Password และ PIN
- `getCurrentUserSession`: ดึงข้อมูลผู้ใช้ปัจจุบัน (รองรับทั้ง Cookie และ Supabase Session)
- `changeExternalPIN`: ฟังก์ชันให้ Guest เปลี่ยน PIN ด้วยตัวเอง (ต้องเช็ค PIN เดิม)

### 🏗️ Shared Library
**File Path:** `lib/auth.js`
- `ROLE_MAP`: การจับคู่ชื่อ Role
- `ROUTE_PERMISSIONS`: การกำหนดสิทธิ์เข้าถึงแต่ละหน้า (Access Control)
- `ROLE_BADGE`: ข้อมูลสีและ Emoji ของแต่ละบทบาท

---

## 4. Security Protocols (ระเบียบความปลอดภัย)

1.  **Password (Internal):** บังคับขั้นต่ำ 8 ตัวอักษร, มีอักษรพิมพ์ใหญ่, พิมพ์เล็ก, ตัวเลข และอักขระพิเศษ
2.  **PIN (External):** บังคับเป็น **ตัวเลข 6 หลักเท่านั้น**
3.  **Encryption:** ทั้ง Password และ PIN จะถูกเข้ารหัสแบบ One-way Hash ก่อนลง Database เสมอ (Password โดย Supabase / PIN โดย Bcrypt)
4.  **Session Management:**
    - Staff ใช้ Supabase Session (JWT ใน Cookie `sb-access-token`)
    - External ใช้ Custom Cookie (Cookie `guest-session` เข้ารหัส Base64)

---
## 📜 Change Logs (บันทึกการเปลี่ยนแปลง)

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

---

## 🚀 5. Pending Infrastructure Tasks (งานที่รอการดำเนินการ)

หัวข้อนี้ระบุงานส่วนโครงสร้างพื้นฐานที่ต้องประสานงานกับผู้ดูแลโดเมน (Outsource) เพื่อให้ระบบทำงานได้สมบูรณ์:

### 📧 การตั้งค่า Resend.com (ระบบส่งอีเมล)
เพื่อให้ระบบสามารถส่งอีเมลหาผู้ใช้งานภายนอกได้ ต้องดำเนินการดังนี้ใน **Cloudflare DNS**:
1.  **Domain Verification:** เพิ่มค่า DKIM (CNAME Records) ที่ได้จาก Resend Dashboard ลงใน Cloudflare
2.  **SPF Record Update:** แก้ไขค่า TXT (SPF) เดิมของบริษัท โดยการเพิ่ม `include:resend.com` เข้าไปในแถวเดียวกับ Microsoft 365 (ห้ามลบของเดิม และห้ามสร้างแถวใหม่)
    *   *ค่าที่แนะนำ:* `v=spf1 include:spf.protection.outlook.com include:resend.com -all`
3.  **Sender Identity:** เมื่อทำการ Verify เสร็จแล้ว ให้เปลี่ยนค่าผู้ส่งจาก `onboarding@resend.dev` เป็นเมลบริษัท (เช่น `it-support@dowa-tht.co.th`) ในไฟล์ `app/actions/admin.js` และ `app/actions/recovery.js`

---
*เอกสารฉบับนี้อัปเดตล่าสุด: 2026-04-30 โดย Antigravity AI*
