# 🛡️ DOWA IT System: Development Standards & Core Principles

เอกสารฉบับนี้คือ "หัวใจหลัก" ของการพัฒนาระบบ DOWA IT เพื่อให้มั่นใจว่าทุกฟังก์ชันที่ถูกสร้างขึ้นมีมาตรฐานระดับ Enterprise, ปลอดภัยสูงสุด และมีระบบตรวจสอบที่ครอบคลุม (Standard & Comprehensive)

---

## 💎 1. Zero-Trust Security (หัวใจด้านความปลอดภัย)
*   **Server-Side First:** ห้ามเชื่อข้อมูลจากฝั่ง Client (หน้าบ้าน) เพียงอย่างเดียว ทุกการบันทึกข้อมูล (Server Actions/APIs) ต้องมีการตรวจสอบ Session และสิทธิ์ (Role) ในระดับ Server เสมอ
*   **Double-Lock Authentication:** ระบบต้องรักษากลไกการเช็ค Whitelist ควบคู่กับ SSO อย่างเคร่งครัด เพื่อป้องกัน "Ghost Users" หรือการเข้าถึงโดยไม่ได้รับอนุญาต
*   **Hard Blacklist:** รักษาและตรวจสอบรายชื่ออีเมลต้องห้ามอย่างเข้มงวดในระดับ Code Logic (`lib/auth.js`)

---

## 🕒 2. Full Audit Trail (ระบบจดบันทึกที่ครอบคลุม)
*   **Standard Fields:** ทุกตารางข้อมูลหลักต้องมีฟิลด์ `created_at`, `updated_at`, `created_by` (ID ของผู้ทำรายการ) และ `updated_by` เสมอ
*   **Login/Logout Logs:** ทุกการเข้า-ออกจากระบบ ไม่ว่าจะผ่าน Email/Password หรือ Microsoft SSO ต้องมีการบันทึก Log ลงในตาราง `login_logs` พร้อมข้อมูล User Agent และ Timestamp
*   **Action Tracking:** ฟังก์ชันที่สำคัญต้องมีการบันทึกประวัติการเปลี่ยนแปลง เพื่อให้สามารถตรวจสอบย้อนกลับ (Traceability) ได้ 100% โดยใช้รูปแบบ `Action | Details` เสมอ
*   **Identity Integrity:** ทุกการยืนยันตัวตนผ่าน PIN ต้องมีการประทับตรา `(Verified by PIN)` ใน Log เพื่อรองรับกฎหมายธุรกรรมทางอิเล็กทรอนิกส์

---

## 🏛️ 3. Unified Architecture & Standards
*   **Inter-Module Communication:** การสื่อสารระหว่าง Module (เช่น Incident และ Checklist) ต้องผ่าน Unified Action (`onDocumentFinalApproval`) เพื่อให้แน่ใจว่าเกิด Logging และ Side Effects ที่ถูกต้องครบถ้วน
*   **Consistent Role Mapping:** ใช้ระบบ Role มาตรฐาน (`administrator`, `supervisor`, `approval`, `guest`) เท่านั้น ห้ามใช้ค่าอื่นนอกเหนือจากนี้เพื่อป้องกันความสับสน
*   **Database Constraints:** ใช้ Check Constraints ในระดับ Database เพื่อเป็นด่านสุดท้ายในการควบคุมความถูกต้องของข้อมูล (Data Integrity)
*   **UI/UX Consistency:** 
    *   รักษาระบบ Font (Noto Sans Thai) ให้สม่ำเสมอในทุกจุด (Buttons, Placeholders, Inputs)
    *   รักษาระดับ Aesthetics ให้ดู Premium และทันสมัยอยู่เสมอ

---

## 🛠️ 4. User Creation Standard (มาตรฐานการสร้างผู้ใช้)
*   **Dual-Record Requirement:** ทุกครั้งที่มีการสร้าง User ใหม่ ระบบต้องทำการบันทึกข้อมูลควบคู่กันใน 3 ส่วนเสมอ:
    1.  **Supabase Auth:** สร้างบัญชีผู้ใช้งานหลักเพื่อใช้ในการเข้าสู่ระบบ
    2.  **User Whitelist:** บันทึกอีเมลในรูปแบบ SHA-256 Hash ลงในตาราง `user_whitelist` เพื่อเป็นด่านตรวจสิทธิ์ชั้นที่สอง (Double-Lock)
    3.  **User Profiles:** บันทึกข้อมูลส่วนตัวและสิทธิ์การใช้งานลงในตาราง `user_profiles` (Source of Truth)
*   **Atomic Logic:** การทำงานต้องมีความต่อเนื่อง หากขั้นตอนใดล้มเหลว ระบบต้องแจ้งเตือนและระบุสาเหตุอย่างชัดเจน

---

## 🏗️ 5. Robust Implementation
*   **Error Handling:** ทุก Server Action ต้องมีระบบ `try-catch` และส่ง Response ที่ชัดเจน (Success/Error Message) กลับไปหาผู้ใช้
*   **Non-Destructive Operations:** หลีกเลี่ยงการลบข้อมูลแบบถาวร (Hard Delete) หากไม่จำเป็น และให้ความสำคัญกับ `is_active` หรือ Soft Delete เพื่อรักษาความต่อเนื่องของข้อมูล

---

> [!IMPORTANT]
> **"ความแม่นยำและมาตรฐาน คือหัวใจของระบบเรา"**
> ผู้พัฒนา (AI และมนุษย์) ต้องอ่านและปฏิบัติตามมาตรฐานนี้ในทุกการแก้ไขโค้ด (Git Commit/Code Update) โดยไม่มีข้อยกเว้น

---
*Last Updated: 01-May-2026*
