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

### 6.0 The Gatekeeper Standard (มาตรฐานการตรวจสอบทางเข้า)
เพื่อให้ระบบมีความปลอดภัยระดับสูงสุดและรองรับ Next.js 16 (App Router) ระบบจะใช้สถาปัตยกรรมแบบ **"Global Proxy & API-Initialization"**:

1. **Server-Side Proxy (Gatekeeper)**:
    - ใช้ `proxy.js` (Next.js 16 Standard) เป็นด่านตรวจระดับ Network ก่อนเข้าถึงทุก Route ใน Dashboard
    - **Read-Only Mode**: Proxy จะใช้ `ANON_KEY` ในการอ่านค่า `is_onboarded` จาก Database เท่านั้น เพื่อความรวดเร็วและปลอดภัย (ห้ามใช้ Proxy เขียนข้อมูลลง DB โดยตรงเนื่องจากข้อจำกัดด้าน RLS)
    - **Cookie Synchronization**: ตรวจสอบ Cookie `dowa_onboarded` หากไม่พบหรือค่าเป็น `false` จะทำการเช็ค DB ซ้ำหนึ่งครั้งเพื่ออัปเดต Cookie ให้เป็นปัจจุบัน (ป้องกันปัญหา Cookie Stale)

2. **Onboarding Initialization API**:
    - หาก Proxy พบว่าผู้ใช้จำเป็นต้องทำ Onboarding แต่ไม่มี Token ในระบบ ระบบจะ Redirect ไปที่ `/api/onboarding/init`
    - **Service Role Power**: API นี้จะใช้ `SERVICE_ROLE_KEY` เพื่อสร้าง Onboarding Token และบันทึกลงฐานข้อมูลอย่างถูกต้อง (ข้ามขีดจำกัด RLS)
    - **Guaranteed Token**: API นี้จะรับประกันว่าผู้ใช้จะมี Token ที่ถูกต้องก่อนถึงหน้า `/onboarding` เสมอ เพื่อป้องกันการเด้งกลับ (Redirect Loop)

3. **Self-Healing UI**:
    - หน้า `/onboarding` จะตรวจสอบ Token ใน URL หากหายไปจะพยายามดึงจาก DB หรือ Redirect กลับไปที่จุดเริ่มต้นเพื่อขอ Token ใหม่

> [!CAUTION]
> **Redirect Loop Prevention**: ห้ามให้ Proxy และ Frontend Layout ทำการ Redirect ไปมาโดยไม่มีจุดสิ้นสุด หากมีการตรวจพบสภาวะ Loop ระบบต้องดีดกลับไปที่หน้า Login (`/`) เพื่อล้างสถานะและเริ่มใหม่เสมอ

### 6.1 Standard Onboarding Flow (ผ่านลิงก์คำเชิญ)
1. **Quick Add**: Admin เพิ่มผู้ใช้ -> ระบบส่งอีเมลพร้อม Onboarding Token
2. **First Interaction**: User กดลิงก์ในอีเมล -> เข้าสู่หน้า `/onboarding`
3. **The Tour**: User ทำตามขั้นตอน (Welcome -> Password -> PIN -> SSO)
4. **Completion**: ระบบตั้งค่า `is_onboarded = true` และ Redirect ไปหน้า Login
5. **Final Result**: User ล็อกอินครั้งแรก -> เข้าสู่หน้า Dashboard ทันที (เพราะทำ Onboarding ไปแล้ว)

### 6.2 Recovery Onboarding Flow (ผ่านการลืมรหัสผ่าน)
1. **Quick Add**: Admin เพิ่มผู้ใช้ -> ผู้ใช้ไม่กดลิงก์อีเมล แต่มาที่หน้า Login เอง
2. **Forgot Password**: User กด "ลืมรหัสผ่าน" -> ยืนยัน OTP -> ตั้งรหัสผ่านใหม่ที่ `/reset-password`
3. **First Login**: User ล็อกอินด้วยรหัสใหม่ -> ระบบตรวจพบ `is_onboarded = false`
4. **Forced Tour**: ระบบดีด User ไปที่หน้า `/onboarding` อัตโนมัติ
7. Troubleshooting: The Redirect Loop Trap (กรณีศึกษาการเกิด Loop)
ปัญหานี้เคยเกิดขึ้นและใช้เวลาแก้ไขนานเนื่องจากความซับซ้อนของ Layer ความปลอดภัย จึงต้องบันทึกไว้เป็นบทเรียน:

- **สาเหตุของปัญหา**: 
    1. Proxy (ANON_KEY) ตรวจพบว่า User ไม่มี Token -> พยายามสร้างและ `update` ลง DB -> **ล้มเหลว** เพราะ Anon Key ไม่มีสิทธิ์เขียนตาราง `user_profiles` (RLS Policy)
    2. Proxy ไม่รู้ว่าเขียนไม่เข้า จึง Redirect ไปที่ `/onboarding?token=...`
    3. หน้า Onboarding ตรวจสอบ Token ใน DB แล้วไม่พบ (เพราะเขียนไม่ติด) -> ดีดกลับไปหน้าแรก (`/`)
    4. หน้าแรกดีดกลับไป Proxy -> เกิด Loop ไม่รู้จบ
- **การป้องกัน**: 
    - **กฎเหล็ก**: ห้ามให้ Proxy (หรือส่วนใดที่ใช้ Anon Key) ทำหน้าที่สร้าง/อัปเดต Token ใน DB
    - **โซลูชัน**: ต้องส่งต่อไปยัง API Route ที่มีสิทธิ์ระดับ `SERVICE_ROLE` เท่านั้นเพื่อให้แน่ใจว่า Token จะถูกบันทึกสำเร็จก่อนถึงมือผู้ใช้

---
*บันทึกมาตรฐานนี้เมื่อ: 07-May-2026 10:30 (Updated Gatekeeper Architecture & Loop Prevention)*
