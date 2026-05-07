# 🛡️ Standard: User Management & Security Protocols

เอกสารฉบับนี้กำหนดมาตรฐานการจัดการผู้ใช้ (User Lifecycle) และระเบียบความปลอดภัยในการยืนยันตัวตน เพื่อให้ระบบมีความน่าเชื่อถือสูงสุด รองรับการตรวจสอบ (Audit) และป้องกันการสวมรอย

---

## 1. User Creation Flow (กระบวนการสร้างผู้ใช้)

ระบบรองรับการสร้างผู้ใช้ 2 รูปแบบหลักที่มีมาตรฐานความปลอดภัยต่างกันตามวัตถุประสงค์:

### 1.1 Quick Add (หน้าจอ Incident)
- **วัตถุประสงค์:** สำหรับเพิ่มพนักงานหน้างาน (Requester) หรือบุคคลภายนอกเพื่อให้สามารถเลือกชื่อในเอกสารและเซ็นชื่อได้ทันที
- **มาตรฐานความปลอดภัย:**
    - **No Default PIN:** ห้ามตั้งค่า PIN มาตรฐาน (เช่น 123456) ให้ผู้ใช้เด็ดขาด
    - **OTP Requirement:** ระบบจะสร้างรหัส OTP 6 หลักที่มีอายุ **30 นาที** และส่งเข้าอีเมลผู้ใช้เพื่อใช้ในการเซ็นชื่อครั้งแรก
    - **Unverified Status:** ผู้ใช้ที่เพิ่มผ่านช่องทางนี้จะมีสถานะ `is_onboarded = false` และต้องทำ Onboarding ก่อนเข้าถึง Dashboard หลัก

### 1.2 Account Management (หน้าจอ Settings)
- **วัตถุประสงค์:** สำหรับพนักงานที่ต้องเข้าใช้งานระบบเป็นประจำ
- **Creation Paths:**
    - **Invite Path (Name + Email):** ระบบจะส่งอีเมลเชิญเพื่อให้ User เข้ามาตั้งรหัสผ่านเอง (Self-Registration)
    - **Manual Path (Full Credentials):** หาก Admin ตั้งรหัสผ่านให้ ระบบต้องถามความสมัครใจก่อนส่งรหัสผ่านทางอีเมล
- **Password Complexity:** ทุกบัญชีที่สร้างผ่านช่องทางนี้ต้องผ่านเกณฑ์ความซับซ้อน (Complexity) ในขั้นตอน Onboarding

---

## 2. Unified Onboarding Standard (มาตรฐานการเริ่มใช้งานครั้งแรก)

ทุกผู้ใช้ที่ถูกสร้างใหม่ต้องผ่านกระบวนการ **Onboarding (System Tour)** ก่อนเข้าถึงระบบจริง เพื่อยืนยันความเป็นเจ้าของบัญชี (Non-Repudiation)

### ขั้นตอนบังคับ (Mandatory Steps):
1.  **Identity Verification:** ยืนยันตัวตนผ่านลิงก์ในอีเมล หรือรหัสชั่วคราว
2.  **Password Complexity Update:** บังคับเปลี่ยนรหัสผ่านตามเกณฑ์:
    - ขั้นต่ำ 8 ตัวอักษร
    - ประกอบด้วย: ตัวพิมพ์ใหญ่ (A-Z), ตัวพิมพ์เล็ก (a-z), ตัวเลข (0-9) และอักขระพิเศษ
3.  **Signature PIN Setup:** บังคับตั้งค่า PIN 6 หลักสำหรับใช้ลงนามเอกสาร (Admin/IT จะไม่ทราบ PIN นี้)
4.  **Profile Completion:** ตรวจสอบชื่อ เบอร์โทรศัพท์ และเชื่อมต่อ SSO (ถ้ามี)

---

## 3. Guest User Expiry Policy (นโยบายบัญชี Guest)

เพื่อความปลอดภัย บัญชีประเภท Guest จะมีความจำกัดด้านเวลา:
- **Default TTL:** 3 วัน นับจากวันที่สร้าง
- **Auto-Deactivation:** เมื่อครบกำหนด ระบบจะเปลี่ยนสถานะเป็น `is_active = false` โดยอัตโนมัติ
- **Renewal:** การเปิดใช้งานใหม่ต้องทำโดยผู้มีสิทธิ์ระดับ Supervisor ขึ้นไปเท่านั้น

---

## 4. Digital Signature & OTP Standard

การลงนามในเอกสารอิเล็กทรอนิกส์ต้องรักษาระดับความปลอดภัยดังนี้:
- **Verified Users:** ใช้ Signature PIN 6 หลักที่ผู้ใช้ตั้งเอง
- **Unverified Users (Quick Add):** ใช้ **Email OTP** ที่ส่งเข้าอีเมลส่วนตัวเท่านั้น
- **Audit Logging:** ทุกการเซ็นชื่อต้องบันทึก Timestamp, IP Address และประเภทการยืนยันตัวตน (PIN หรือ OTP)

---

---
6. Detailed Onboarding & Recovery Flows (รายละเอียดขั้นตอนการเริ่มใช้งาน)

เพื่อให้แน่ใจว่าผู้ใช้ทุกคนได้รับการตั้งค่าความปลอดภัยอย่างครบถ้วน ระบบจะบังคับใช้ Flow ดังนี้:

### 6.0 The Advanced Gatekeeper Architecture (สถาปัตยกรรมป้องกัน Loop ขั้นสูง)
เพื่อให้ระบบเสถียรที่สุดในสภาวะที่มีการเปลี่ยน Session และ Token ตลอดเวลา ระบบจะแบ่งหน้าที่การทำงานแบบเด็ดขาด (Separation of Concerns):

1. **Proxy (Server-side Guard)**:
    - **หน้าที่เดียว**: ป้องกันการเข้าถึงโฟลเดอร์ `/dashboard` โดยไม่ได้รับอนุญาต
    - **เงื่อนไข**: หากพบว่ามี Session แต่ยังไม่ได้ Onboard (เช็คจาก Cookie หรือ DB) ให้ Redirect ไปที่ `/api/onboarding/init` ทันที
    - **กฎเหล็ก**: ห้าม Proxy เข้าไปแทรกแซงหน้า Login (`/`) หรือหน้า Onboarding (`/onboarding`) เพื่อป้องกันการแย่งกันตัดสินใจ (Redirect Race Condition)

2. **Login Page (Client-side Router)**:
    - **หน้าที่**: จัดการการนำทางเริ่มต้นหลังโหลดหน้าเว็บ
    - **Logic**: เมื่อพบ Session ค้างอยู่ ให้ตรวจสอบสถานะ Profile
        - หาก Onboard แล้ว -> ไป `/dashboard`
        - หากยังไม่ Onboard -> **ต้องใช้ `window.location.href = '/api/onboarding/init'`** (ห้ามใช้ `router.push` เพื่อบังคับให้ Browser ส่ง Cookie ล่าสุดไปยัง API)

3. **Onboarding Initialization API**:
    - **หน้าที่**: สร้างหรือดึง Token ที่ถูกต้องจาก Database โดยใช้สิทธิ์ **Service Role**
    - **ผลลัพธ์**: รับประกันว่า User จะเข้าหน้า Onboarding พร้อม Token ที่ใช้งานได้จริงเสมอ

---

### 7. Troubleshooting: The Redirect Loop Post-Mortem (บทเรียนราคาแพง)
ปัญหาวนลูปที่ใช้เวลาแก้ไขนาน เกิดจากเหตุการณ์ลูกโซ่ดังนี้:

1. **The Conflict**: Proxy พยายามดักหน้า Login (`/`) และสั่ง Redirect ไป Onboarding
2. **The Stale State**: Client-side ในหน้า Login ก็สั่ง Redirect ไป Onboarding เช่นกัน แต่ใช้ Logic ที่บางครั้งมองไม่เห็น Token
3. **The Bounce Back**: หน้า Onboarding เมื่อไม่เห็น Token (เพราะการเขียน DB ล้มเหลวจากสิทธิ์ Anon Key ในตอนแรก) จึงดีดกลับไปหน้า Login
4. **The Loop**: เกิดการเด้งไปมา `Home -> Proxy -> Onboarding -> Home` ไม่รู้จบ

**วิธีป้องกันอย่างถาวร (Permanent Rules):**
- ✅ **Proxy** ต้องคุมเฉพาะ `/dashboard` เท่านั้น
- ✅ การเปลี่ยนสถานะ Database ต้องทำผ่าน **API Route + Service Role** เท่านั้น
- ✅ การ Redirect ไปหา API ที่ต้องใช้ Session ต้องใช้ **`window.location.href`** เพื่อความชัวร์ของ Cookie

---
*บันทึกมาตรฐานนี้เมื่อ: 07-May-2026 10:30 (Updated Gatekeeper Architecture & Loop Prevention)*
