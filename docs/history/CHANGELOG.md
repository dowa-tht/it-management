# 🕒 ประวัติการเปลี่ยนแปลง (Changelog)

- **[13:15] Hide Linked Form from No. Series Page**
  - ดำเนินการซ่อนคอมโพเนนต์ dropdown "Linked Form" จากหน้าจอ No. Series Management ([app/dashboard/settings/no-series/page.js](file:///c:/Users/Lenovo/dowa-it-system/app/dashboard/settings/no-series/page.js))
  - ปรับสไตล์ Grid ใน Header Settings จาก 4 คอลัมน์เป็น 3 คอลัมน์เพื่อให้เลย์เอาต์สวยงามสมดุล
  - แก้ไข bug ฟังก์ชันบันทึกข้อมูลส่วนหัว (Save Header) โดยเปลี่ยนจาก `showMessage` ที่ไม่มีอยู่จริงในไฟล์นี้ ให้เรียกใช้ `setMsg` เพื่อแสดงแจ้งเตือนสถานะสำเร็จ/ล้มเหลวได้อย่างถูกต้อง
  - รัน sanity test ด้วย `npm test` ผลลัพธ์ 34/34 ผ่านทั้งหมด
- **[11:05] login_logs Schema Fix & Historical Log Restoration**
  - วิเคราะห์และระบุข้อจำกัดของตาราง `public.login_logs` ที่ไม่มีคอลัมน์ `metadata` ส่งผลให้การ Insert ข้อมูล `action = 'login'` ที่มี metadata ล้มเหลวทั้งหมดในอดีต (ขณะที่ Logout ทำงานปกติเพราะไม่มีการส่งฟิลด์นี้)
  - เพิ่มการตรวจสอบในคำสั่ง Insert/Select เพื่อสร้างคอลัมน์ `metadata` JSONB สำเร็จ
  - ดำเนินการย้ายประวัติการล็อกอินย้อนหลัง (Data Migration) จาก `auth.audit_log_entries` กลับมาเข้าตาราง `public.login_logs` เฉพาะผู้ใช้ที่ยังคงใช้งานอยู่ในระบบจริง (ป้องกัน Foreign Key Error จาก Deleted Users)
  - สร้างไฟล์ migration: [20260610_add_metadata_to_login_logs_and_restore_history.sql](file:///c:/Users/Lenovo/dowa-it-system/supabase/migrations/20260610_add_metadata_to_login_logs_and_restore_history.sql)
- **[10:10] Session Restore Login Logging & CHECK Constraint Alignment**
  - ค้นพบสาเหตุหลักของปัญหา Log การ Login ไม่บันทึกเนื่องจากติดกฎ **CHECK Constraint** ของฐานข้อมูลบนตาราง `login_logs` (ที่อนุญาตเฉพาะค่า `'login'` และ `'logout'`)
  - ปรับปรุงการบันทึกประวัติการ Login ทั้งหมด (Unified, SSO, Session Restore) ให้ใช้ Action เป็นตัวพิมพ์เล็ก `'login'` เพื่อให้ผ่านด่าน Constraint ของฐานข้อมูล และจัดเก็บข้อมูลแยกประเภทไว้ใน `metadata` แทน
  - เพิ่มการส่ง JWT Access Token จาก Client-side ไปใช้ดึงและตรวจสอบสิทธิ์ผู้ใช้ผ่าน Supabase admin ใน Server Action `recordSessionRestoreLog` เพื่อแก้ปัญหา Cookie ยังไม่ซิงค์บนเบราว์เซอร์ที่เปิดใหม่
  - ปรับปรุง [login.js](file:///c:/Users/Lenovo/dowa-it-system/app/actions/login.js), [page.js](file:///c:/Users/Lenovo/dowa-it-system/app/page.js), [layout.js](file:///c:/Users/Lenovo/dowa-it-system/app/dashboard/layout.js) และ [route.js](file:///c:/Users/Lenovo/dowa-it-system/app/auth/callback/route.js) ตามแผนการปรับปรุงโครงสร้างข้อมูลนี้
- **[09:28] Production Schema Synchronization & Alignment**
  - วิเคราะห์เปรียบเทียบ Schema Drift ระหว่างสภาพแวดล้อม Dev และ Production
  - สร้างสคริปต์ Sync Dev: [20260610_align_dev_schema_to_production.sql](file:///c:/Users/Lenovo/dowa-it-system/supabase/migrations/20260610_align_dev_schema_to_production.sql) เพื่อบันทึกคอลัมน์กู้คืนและอนุมัติที่คุณทำไว้บน Production ให้ตรงกันในเครื่อง
  - สร้างและแนะนำ SQL Patch สำหรับ Production: [20260610_production_schema_alignment_patch.sql](file:///c:/Users/Lenovo/dowa-it-system/supabase/migrations/20260610_production_schema_alignment_patch.sql) แบบปลอดภัย (Non-destructive) เพื่อแก้ไขตาราง/คอลัมน์และแคสต์ประเภทข้อมูลตามโค้ด Runtime
  - ตรวจสอบ Parity สำเร็จ และรันเทส `npm test` ทั้งหมดผ่าน 100% (34/34 tests passed)
- **[08:17] Create production migration hand-off document**
  - สร้างเอกสารส่งต่องาน [HANDOFF_PRODUCTION_STATUS_2026_06_10.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/HANDOFF_PRODUCTION_STATUS_2026_06_10.md)
  - สรุปเป้าหมาย สถานะ production ปัจจุบัน สิ่งที่ยืนยันแล้ว ความเสี่ยงค้าง และรายการงานที่ agent ถัดไปต้องทำต่อ
  - ย้าย changelog ของวันที่ 8-9 มิถุนายน 2569 ไป archive เพื่อให้ `CHANGELOG.md` เหลือเฉพาะของวันปัจจุบันตามกฎ Daily Log Shrinking
- **[08:17] Add reusable hand-off prompt document**
  - สร้าง [HANDOFF_PROMPT_PRODUCTION_STATUS_2026_06_10.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/HANDOFF_PROMPT_PRODUCTION_STATUS_2026_06_10.md)
  - จัดรูปแบบเป็น prompt พร้อมใช้สำหรับ agent ถัดไป โดยระบุ environment, เป้าหมาย, guardrails, ลำดับการอ่านเอกสาร, runtime evidence files, และ task continuation list

## 📦 บันทึกย้อนหลัง (Archives)

### มิถุนายน 2569 (June 2026)
- [CHANGELOG_2026_06_09.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_06_09.md)
- [CHANGELOG_2026_06_06.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_06_06.md)
- [CHANGELOG_2026_06_05.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_06_05.md)
- [CHANGELOG_2026_06_04.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_06_04.md)

### พฤษภาคม 2569 (May 2026)
- [CHANGELOG_2026_05_29.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_29.md)
- [CHANGELOG_2026_05_28.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_28.md)
- [CHANGELOG_2026_05_27.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_27.md)
- [CHANGELOG_2026_05_26.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_26.md)
- [CHANGELOG_2026_05_25.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_25.md)
- [CHANGELOG_2026_05_21.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_21.md)
- [CHANGELOG_2026_05_20.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_20.md)
- [CHANGELOG_2026_05_19.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_19.md)
- [CHANGELOG_2026_05_18.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_18.md)
- [CHANGELOG_2026_05_17.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_17.md)
- [CHANGELOG_2026_05_15.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_15.md)
- [CHANGELOG_2026_05_14.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_14.md)
- [CHANGELOG_2026_05_13.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_13.md)
- [CHANGELOG_2026_05_12.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_12.md)
- [CHANGELOG_2026_05_11.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_11.md)
- [CHANGELOG_2026_05_10.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_10.md)
- [CHANGELOG_2026_05_09.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_09.md)
- [CHANGELOG_2026_05_08.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_08.md)
- [CHANGELOG_2026_05_07.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_07.md)

---
*อัปเดตล่าสุด: 10-Jun-2026 13:15*
