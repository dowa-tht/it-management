# 🕒 ประวัติการเปลี่ยนแปลง (Archived)

## 4 มิถุนายน 2569 (04-Jun-2026)

- **[17:35] Fix Auditor RLS Permissions: Enable Backup Log & IT Checklist visibility**
  - **ปรับปรุงสิทธิ์ RLS สำหรับบทบาทผู้ตรวจสอบ (Auditor/Guest):**
    - ปรับปรุง `supabase/migrations/add_rls_policies.sql` เพื่อให้สิทธิ์อ่านข้อมูลแก่ Role `auditor` ตรงตามข้อกำหนดความโปร่งใส:
      1. แก้ไขฟังก์ชัน `current_user_can_access_checklist_doc` ให้ผู้ใช้ระดับ `auditor` สามารถเข้าถึงและส่องดูข้อมูลประวัติของหน้า **IT Checklist** ได้ทุกใบ เพื่อใช้สำหรับงานตรวจสอบประวัติอย่างครอบคลุม
      2. สั่งเปิดใช้ความปลอดภัย RLS บนตาราง `backup_logs` พร้อมเขียนนโยบายการอ่านข้อมูล `authenticated_select_backup_logs` เพื่อให้บทบาทผู้ตรวจสอบสามารถมองเห็นรายการย้อนหลังในหน้า **Backup Log** และใช้งานฟิลเตอร์ตัวกรองเวลาบนหน้าเว็บได้สมบูรณ์เป็นรายแรก

- **[17:25] Suppress Hydration Warnings from Browser Extensions**
  - **ป้องกันข้อผิดพลาดการประสานข้อมูล (React Hydration Mismatch):**
    - ปรับปรุง `app/layout.js` โดยเพิ่มคีย์ `suppressHydrationWarning` ลงในแท็ก `<html>` และ `<body>`
    - ผลลัพธ์: ระงับการแจ้งเตือนจอแดงของ Next.js ที่เกิดจากการฝังแอตทริบิวต์พิเศษของ Browser Extensions (เช่น Grammarly, Google Translate, 1Password) บนตัวผู้ใช้ภายนอก ทำให้เทสงานบน Localhost ได้ราบรื่น สบายตา และไม่รบกวนการเตือนของหน้าเว็บส่วนหลัก

- **[17:15] Fix User Creation and Onboarding Flow Robustness**
  - **แก้ไขปัญหาลิงก์ลงทะเบียนหมดอายุ/ไม่ถูกต้อง (Link Invalid / Expired):**
    - ปรับปรุง `app/actions/onboarding.js`, `app/actions/login.js` และ `app/api/onboarding/init/route.js` ให้ตรวจสอบอายุของ Onboarding Token โดยการอ้างอิงจากเวลาสร้างแถวข้อมูล `created_at` ของโปรไฟล์ผู้ใช้งาน (อายุ 24 ชั่วโมง) แทนคอลัมน์ `onboarding_token_expires` ที่ไม่มีอยู่ในฐานข้อมูลของระบบ
    - สิ่งนี้ช่วยรันระบบ Onboarding ได้อย่างราบรื่นทันทีโดยไม่ต้องรัน SQL เพื่อเพิ่มคอลัมน์หลังบ้านใหม่
  - **ระบบตรวจสอบก่อนสร้างและระบบกู้คืนอัตโนมัติ (Pre-flight Checks & Self-Healing):**
    - ปรับปรุงฟังก์ชัน `createAdminUser` ใน `app/actions/admin.js` ให้ทำการตรวจสอบความถูกต้องก่อนสมัครสมาชิกใหม่:
      1. ตรวจสอบว่ามีอีเมลนั้นใน `user_profiles` แล้วและเปิดใช้งานเสร็จสิ้นแล้วหรือไม่ (`is_onboarded = true`) หาก onboard แล้วระบบจะแจ้งแอดมินล่วงหน้าอย่างสุภาพ
      2. ตรวจสอบว่ามีอีเมลนั้นในระบบแต่ยังรอ Onboarding หรือไม่ (`is_onboarded = false`) หากยังไม่ onboard ระบบจะบล็อกการสร้างเพื่อป้องกันข้อมูลซ้ำซ้อน และแจ้งสเตตัสพร้อมคำแนะนำให้แอดมินส่งอีเมลลิงก์เชิญใหม่
      3. **[Self-Healing]** หากตรวจพบว่ามีอีเมลนั้นหลงเหลืออยู่ใน `auth.users` แต่ไม่มีตัวตนฝั่ง `user_profiles` (สถานะข้อมูลตกค้าง/ Orphaned User) ระบบจะสั่งลบบัญชีค้างคานั้นฝั่ง Auth ออกโดยอัตโนมัติทันทีก่อนเริ่มการสร้างผู้ใช้ใหม่เพื่อให้การลงทะเบียนทำงานได้อย่างหมดจด ไร้ข้อผิดพลาดสิทธิ์ซ้ำซ้อนอีกต่อไป

- **[15:30] Fix Dashboard False Positive: Alignment of MY SENT PENDING to assigned_to_id**
  - แก้ไขปัญหา Badge และ รายการ "My Sent Pending" บน Dashboard แสดงข้อมูลไม่ตรงกับความหมายจริง (False Positive)
  - ปรับ `app/actions/dashboard.js` (`getDashboardData`) ให้ดึงจำนวนเคสรออนุมัติของฉันโดยอิงจาก `assigned_to_id` (เจ้าหน้าที่ไอทีที่รับผิดชอบและส่งงานขออนุมัติ) แทน `reported_by_id` (ผู้แจ้ง)
  - ปรับ `app/actions/workflow.js` (`getMySentPendingItems`) ให้ดึงรายการเคสรออนุมัติของฉันตาม `assigned_to_id` เช่นเดียวกัน เพื่อให้ข้อมูลหน้า UI และ Dashboard สอดคล้องกันตามจริง
  - ปรับปรุงสิทธิ์ควบคุมในหน้า Incident Detail (`app/dashboard/incidents/[id]/page.js`):
    - แยกแยะระหว่าง `isCreator` (เทียบกับ `created_by_id`) และ `isReporter` (เทียบกับ `reported_by_id`) ออกจากกันอย่างถูกต้อง
    - อัปเดตเงื่อนไขปุ่มอนุมัติ `canApprove` ของบทบาท `reporter` ให้ตรวจสอบเงื่อนไข `isReporter` อย่างถูกต้อง
    - รักษาความปลอดภัยของปุ่ม `canCancel` ให้ขึ้นเฉพาะกับผู้ส่ง/ผู้สร้างจริง (`isCreator`) เท่านั้น
  - รัน `npm run build` ผ่านสมบูรณ์ 100%

- **[ตอนนี้] Verify Reopen Incident SLA-safe Logic: Test Passed**
  - ทดสอบการกด Reopen บนเอกสาร Incident ที่เคยผ่าน Acknowledge/Assign แล้ว
  - ✅ ยืนยันว่าเคสกลับไป `In Progress` (ไม่ใช่ `Open`) เมื่อมี context เดิมของงาน
  - ✅ ยืนยันว่าไม่เกิด error schema mismatch ระหว่าง Reopen
  - ✅ ตรวจสอบว่า log `Reopen Case` ถูกบันทึกตามปกติ
  - ✅ ตรวจสอบว่าการคำนวณ SLA ไม่เพี้ยนจากการบังคับ Acknowledge ใหม่
  - สามารถใช้งานได้ตามต้องการแล้ว
  - อัปเดต USER_TASKS.md ย้ายงาน P1 ไปยังส่วนงานที่เสร็จสิ้นแล้ว

- **[ตอนนี้] Fix Remote Approve Modal: Display External Reporter Email Correctly**
  - แก้ปัญหาที่ Remote Approve Modal แสดง "ไม่พบอีเมลผู้อนุมัติ" สำหรับ external reporter แม้ว่า OTP จะส่งได้ถูกต้อง
  - เพิ่ม props ใหม่ `targetEmail` และ `targetEmailLabel` ใน `UnifiedApprovalModal` component
  - ปรับ logic การแสดง email ให้รองรับทั้ง internal user (approver) และ external reporter
  - อัปเดต Incident Detail Page ให้ส่ง `incident.reporter_email` และ label "External user" เมื่อเป็น external reporter step
  - ผลลัพธ์: Modal แสดง `reporter@example.com (External user)` แทน "ไม่พบอีเมลผู้อนุมัติ" สำหรับ external reporter
  - ไฟล์ที่เกี่ยวข้อง:
    - `components/workflow/UnifiedApprovalModal.js`
    - `app/dashboard/incidents/[id]/page.js`
  - รัน `npm run build` ผ่านเรียบร้อย (56 routes, 0 errors)
