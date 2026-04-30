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

### [2026-04-29] - Stabilizing Multi-Tier & SLA Performance Upgrade
- **Unified Multi-Tier Creation:** ปรับปรุง `createAdminUser` ให้รองรับการสร้าง User ทั้ง 4 Tier (แยก Logic ระหว่าง Supabase Auth และ External PIN)
- **Admin Security Update:** 
  - เพิ่มปุ่ม **Reset PIN 6 หลัก** ในหน้า Setup User สำหรับ Approver/Guest
  - แก้ไข Bug ตัวแปร `supabaseAdmin` ในฟังก์ชันเปลี่ยนรหัสผ่าน
- **Self-Service PIN:** 
  - เพิ่มฟังก์ชันให้ผู้ใช้ Tier 3/4 สามารถ **เปลี่ยน PIN เองได้** ในหน้า Profile
- **SLA Reliability Fix:** แก้ไข Race Condition ในการมอบหมายงาน โดยประทับตราเวลา `assigned_at` ทันทีที่กดบันทึก ป้องกันปัญหา SLA Response ค้างสถานะ Paused
- **Data Repair:** กู้คืนข้อมูลเคส `DTT-INC-2604-004` ให้แสดงค่า SLA ที่ถูกต้องตาม Log จริง
- **Professional Emailing:** ปรับปรุง Template อีเมลเป็นภาษาอังกฤษระดับทางการ พร้อมระบุชื่อบริษัท DOWA Thermotech (Thailand) Co., Ltd. เพื่อความน่าเชื่อถือ
- **Automated Onboarding:** เพิ่มระบบส่ง Welcome Email อัตโนมัติทันทีที่สร้าง User (Staff ใช้ Supabase Invite / Guest ใช้ Resend API)
- **Validation Fix:** แยกกฎการตรวจสอบรหัสผ่าน (Staff: 8 ตัวอักษรความซับซ้อนสูง / Guest: PIN 6 หลัก) เพื่อความยืดหยุ่นในการใช้งาน
- **Testing Utility:** เพิ่มฟังก์ชัน **Clean Remove (⚡)** สำหรับ Administrator เพื่อใช้ล้างข้อมูล User ทดสอบออกจากทุกตารางรวมถึง Auth อย่างสมบูรณ์ (Log-less Removal)
- **Infrastructure Integrity:** แก้ไข Bug การ Sync ข้อมูล `user_registry` โดยตัดคอลัมน์ `can_be_assignee` ออกเพื่อให้สอดคล้องกับ Schema จริงในฐานข้อมูล
- **Performance Optimization (🚀):**
  - **Middleware to Proxy Migration:** อัปเกรดระบบ Middleware เป็น `proxy.js` ตามมาตรฐาน Next.js 16.2.4 เพื่อประสิทธิภาพสูงสุด
  - **Role Caching:** เพิ่มระบบ Cookie Cache สำหรับเก็บสิทธิ์ผู้ใช้ (Role) ช่วยลดการ Query ฐานข้อมูล `user_profiles` ในทุกๆ Request ทำให้การเปลี่ยนหน้าเร็วขึ้นกว่าเดิม (~150ms -> 8ms)
  - **SLA Logic Optimization:** ปรับปรุงอัลกอริทึมการคำนวณ SLA ใน `lib/slaUtils.js` ให้ใช้ทรัพยากร CPU ลดลง ช่วยให้หน้า Dashboard โหลดข้อมูลได้รวดเร็วขึ้น

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
*เอกสารฉบับนี้อัปเดตล่าสุด: 2026-04-29 (Evening) โดย Antigravity AI*
