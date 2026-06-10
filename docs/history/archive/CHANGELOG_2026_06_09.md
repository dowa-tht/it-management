# 🕒 ประวัติการเปลี่ยนแปลง (Changelog Archive)

## 9 มิถุนายน 2569 (09-Jun-2026)

- **[13:20] Completed Production Database Migration & Schema Fixes**
  - Apply SQL files on Production Supabase successfully.
  - Resolve column drift and syntax errors including `reported_by_id`, `created_by_id`, and `target_group_id`.
  - Update `add_rls_policies.sql` to drop legacy tables.
  - Run `npm run build` successfully.

- **[16:40] Harden onboarding email base URL and Outlook-safe template**
  - เพิ่ม helper กลาง `lib/publicBaseUrl.js` เพื่อ resolve public base URL จาก `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_PUBLIC_BASE_URL`, และ fallback ไป `VERCEL_URL` ก่อนใช้ `localhost`
  - ปรับ onboarding invite email ใน `app/actions/admin.js` และ `app/actions/users.js` ให้ใช้ template กลางแบบ table-based พร้อม fallback link ที่ Outlook อ่านง่ายขึ้น
  - ปรับ `lib/resend.js` ให้ใช้ email wrapper แบบ font-safe สำหรับ email clients แทนการพึ่ง Google Fonts
  - ปรับ `app/actions/user.js`, `app/actions/recovery.js`, `app/actions/workflow.js`, และ `app/api/approval/send/route.js` ให้ลิงก์อีเมล/redirect ใช้ public URL helper เดียวกัน

## 8 มิถุนายน 2569 (08-Jun-2026)

- **[09:12] Daily Log Shrinking & Inspecting .cursorrules**
  - ย้ายบันทึกการเปลี่ยนแปลงของวันที่ 6 มิถุนายน 2569 ไปยัง `CHANGELOG_2026_06_06.md` ตามกฎ Daily Log Shrinking
  - ตรวจสอบไฟล์ `.cursorrules` เพื่อประเมินบทบาทและความจำเป็นในการอ่านของ Agents ในโปรเจกต์นี้
- **[09:14] Sync WINDSURF.md Rules with .cursorrules**
  - เพิ่มการอ้างอิงและกฎเหล็กจาก `docs/standards/WINDSURF.md` เข้าไปใน `.cursorrules`
  - ปรับปรุง `docs/INDEX.md` เพื่อเชื่อมโยงประวัติย้อนหลังของปี 2026-06-05 และ 2026-06-06
- **[09:28] Update AGENTS.md with Silent Thinking Policy & Output Contracts**
  - เพิ่มนโยบาย `[SILENT THINKING POLICY — MANDATORY]` เข้าไปใน `AGENTS.md`
  - อัปเดต `Superpowers Trigger Matrix` เพื่อกำหนดให้การทำงานที่ไม่ใช่ `brainstorming` ต้องใช้ `silent-execution`
  - เพิ่มข้อกำหนดสัญญาผลลัพธ์ (`Output Contract`) ให้แก่บทบาท `Smart AI` และ `Fast AI`
- **[09:31] Create SILENT_EXECUTION.md Standard File**
  - สร้างไฟล์ `docs/standards/SILENT_EXECUTION.md`
  - อัปเดตลิงก์ไปยังมาตรฐานใหม่ลงใน `docs/INDEX.md`
- **[10:00] Audit Incident 404 Route Runtime Desync**
  - ตรวจสอบปัญหา `/dashboard/incidents` ตอบ `404` จาก runtime จริง แม้ route file จะมีอยู่และถูก compile แล้ว
  - สร้างรายงาน `AUDIT_INCIDENT_ROUTE_RUNTIME_DESYNC_2026_06_08.md`
  - อัปเดต `docs/INDEX.md` ให้เชื่อมลิงก์รายงาน audit ฉบับนี้
- **[10:12] Restore Dashboard Child Routes by Restarting Next Dev Runtime**
  - หยุด runtime เก่าที่ให้บริการ `localhost:3000` แล้ว start `next dev` ใหม่จาก workspace ปัจจุบัน
  - ยืนยันว่า `/dashboard/incidents` และ `/dashboard/backup` กลับมาใช้งานได้จริง
  - อัปเดตรายงาน `AUDIT_INCIDENT_ROUTE_RUNTIME_DESYNC_2026_06_08.md` ด้วยผลการแก้ไขและ verification ล่าสุด
- **[10:30] ขยายคอลัมน์ Doc No. และลดคอลัมน์ Review ใน Audit Logs Tab**
  - ปรับ `minWidth: 160` ให้คอลัมน์ Doc No. ใน Audit Logs tab เพื่อให้เลขที่เอกสารแสดงแบบ 1 บรรทัด
  - เพิ่ม `whiteSpace: 'nowrap'` ที่ cell Doc No. ป้องกันการตัดคำ
  - ลดความกว้างคอลัมน์ Review จาก `16px 20px` → `12px 8px` และเซ็ต `width: 80` พร้อม `textAlign: 'center'`
  - เปลี่ยนข้อความปุ่ม "View Details" → "View" เพื่อให้สั้นลง
- **[10:39] ปรับชื่อคอลัมน์ Doc No. เป็นแบบไดนามิก (Dynamic Column Header)**
  - ปรับปรุงให้หน้าจอแสดงผลหัวคอลัมน์จากเดิมที่เป็น "Doc No." ให้กลายเป็น "Target User" เมื่อผู้ใช้เปิดแท็บ "Admin Actions"
- **[12:00] แสดงวันที่ Backup จริง (log_date) ในคอลัมน์ Details ของ Backup Logs**
  - นำค่า `log_date` มาจัดรูปแบบผ่าน `formatDate` แล้วแสดงผลนำหน้าข้อมูล `notes` ในคอลัมน์ Details
- **[14:26] ตรวจสอบและแก้ไขระบบตาม WORKFLOW_GUIDE.md**
  - ตรวจสอบ 95% ของ flow ตาม `WORKFLOW_GUIDE.md`
  - ลบ section ซ้ำในเอกสารและแก้ `notifyApprover` ให้ query `user_profiles`
  - เพิ่ม substitute notification logic สำหรับ `approval_substitutes`
