# 🕒 ประวัติการเปลี่ยนแปลง (Change Logs)

## 8 มิถุนายน 2569 (08-Jun-2026)

- **[09:12] Daily Log Shrinking & Inspecting .cursorrules**
  - ย้ายบันทึกการเปลี่ยนแปลงของวันที่ 6 มิถุนายน 2569 ไปยัง [CHANGELOG_2026_06_06.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_06_06.md) ตามกฎ Daily Log Shrinking
  - ตรวจสอบไฟล์ `.cursorrules` เพื่อประเมินบทบาทและความจำเป็นในการอ่านของ Agents ในโปรเจกต์นี้
- **[09:14] Sync WINDSURF.md Rules with .cursorrules**
  - เพิ่มการอ้างอิงและกฎเหล็กจาก [docs/standards/WINDSURF.md](file:///c:/Users/Lenovo/dowa-it-system/docs/standards/WINDSURF.md) เข้าไปใน [.cursorrules](file:///c:/Users/Lenovo/dowa-it-system/.cursorrules)
  - ปรับปรุง [docs/INDEX.md](file:///c:/Users/Lenovo/dowa-it-system/docs/INDEX.md) เพื่อเชื่อมโยงประวัติย้อนหลังของปี 2026-06-05 และ 2026-06-06
- **[09:28] Update AGENTS.md with Silent Thinking Policy & Output Contracts**
  - เพิ่มนโยบาย `[SILENT THINKING POLICY — MANDATORY]` เข้าไปใน [AGENTS.md](file:///c:/Users/Lenovo/dowa-it-system/AGENTS.md)
  - อัปเดต `Superpowers Trigger Matrix` เพื่อกำหนดให้การทำงานที่ไม่ใช่ `brainstorming` ต้องใช้ `silent-execution`
  - เพิ่มข้อกำหนดสัญญาผลลัพธ์ (`Output Contract`) ให้แก่บทบาท `Smart AI` และ `Fast AI` ภายใต้ `AGENTS.md`
- **[09:31] Create SILENT_EXECUTION.md Standard File**
  - สร้างไฟล์เปล่า [docs/standards/SILENT_EXECUTION.md](file:///c:/Users/Lenovo/dowa-it-system/docs/standards/SILENT_EXECUTION.md) สำหรับเป็นที่ตั้งของนโยบายและมาตรฐานการทำงานแบบประมวลผลเงียบ
  - อัปเดตลิงก์ไปยังมาตรฐานใหม่ลงใน [docs/INDEX.md](file:///c:/Users/Lenovo/dowa-it-system/docs/INDEX.md)
- **[10:00] Audit Incident 404 Route Runtime Desync**
  - ตรวจสอบปัญหา `/dashboard/incidents` ตอบ `404` จาก runtime จริง แม้ route file จะมีอยู่และถูก compile แล้ว
  - สร้างรายงาน [AUDIT_INCIDENT_ROUTE_RUNTIME_DESYNC_2026_06_08.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/AUDIT_INCIDENT_ROUTE_RUNTIME_DESYNC_2026_06_08.md)
  - อัปเดต [docs/INDEX.md](file:///c:/Users/Lenovo/dowa-it-system/docs/INDEX.md) ให้เชื่อมลิงก์รายงาน audit ฉบับนี้
- **[10:12] Restore Dashboard Child Routes by Restarting Next Dev Runtime**
  - หยุด runtime เก่าที่ให้บริการ `localhost:3000` แล้ว start `next dev` ใหม่จาก workspace ปัจจุบัน
  - ยืนยันว่า `/dashboard/incidents` และ `/dashboard/backup` กลับมาใช้งานได้จริง
  - อัปเดตรายงาน [AUDIT_INCIDENT_ROUTE_RUNTIME_DESYNC_2026_06_08.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/AUDIT_INCIDENT_ROUTE_RUNTIME_DESYNC_2026_06_08.md) ด้วยผลการแก้ไขและ verification ล่าสุด
- **[10:30] ขยายคอลัมน์ Doc No. และลดคอลัมน์ Review ใน Audit Logs Tab**
  - ปรับ `minWidth: 160` ให้คอลัมน์ Doc No. ใน Audit Logs tab เพื่อให้เลขที่เอกสารแสดงแบบ 1 บรรทัด
  - เพิ่ม `whiteSpace: 'nowrap'` ที่ cell Doc No. ป้องกันการตัดคำ
  - ลดความกว้างคอลัมน์ Review จาก `16px 20px` → `12px 8px` และเซ็ต `width: 80` พร้อม `textAlign: 'center'`
  - เปลี่ยนข้อความปุ่ม "View Details" → "View" เพื่อให้สั้นลง
  - ไฟล์ที่แก้: `app/dashboard/settings/logs/page.js`
- **[10:39] ปรับชื่อคอลัมน์ Doc No. เป็นแบบไดนามิก (Dynamic Column Header)**
  - ปรับปรุงให้หน้าจอแสดงผลหัวคอลัมน์จากเดิมที่เป็น "Doc No." ให้กลายเป็น "Target User" เมื่อผู้ใช้เปิดแท็บ "Admin Actions" (เนื่องจากคอลัมน์นี้ใช้แสดงผล Email หรือ UUID ของผู้ใช้เป้าหมายในการดำเนินการของ Admin)
  - ไฟล์ที่แก้: `app/dashboard/settings/logs/page.js`
- **[12:00] แสดงวันที่ Backup จริง (log_date) ในคอลัมน์ Details ของ Backup Logs**
  - นำค่า `log_date` (วันที่ทำการ Backup จริง) มาจัดรูปแบบผ่าน `formatDate` แล้วแสดงผลนำหน้าข้อมูล `notes` ในคอลัมน์ Details เช่น `[Backup: 01 / Jun / 2026] ...` เพื่อแก้ไขปัญหาเมื่อมีการบันทึกข้อมูลย้อนหลัง
  - ไฟล์ที่แก้: `lib/audit.js`
- **[14:26] ตรวจสอบและแก้ไขระบบตาม WORKFLOW_GUIDE.md**
  - ตรวจสอบ 95% ของ flow ตาม [WORKFLOW_GUIDE.md](file:///c:/Users/Lenovo/dowa-it-system/docs/manuals/WORKFLOW_GUIDE.md) — พบ 2 จุดที่ต้องแก้ไข
  - **(A) แก้ bug เอกสาร:** ลบ Section §5 Backup Logs ที่ซ้ำซ้อนออกจาก [WORKFLOW_GUIDE.md](file:///c:/Users/Lenovo/dowa-it-system/docs/manuals/WORKFLOW_GUIDE.md) — ลำดับ section ถูกต้องแล้ว: §5=IT Checklist, §6=Backup Logs, §7=System Setup
  - **(B) แก้ bug code + implement feature:** แก้ไข `notifyApprover` function ใน [workflow.js](file:///c:/Users/Lenovo/dowa-it-system/app/actions/workflow.js)
    - แก้ bug ที่ query table `profiles` ผิด → `user_profiles` (ทำให้ email notification ไม่เคยส่งได้เลย)
    - เพิ่ม Substitute Notification logic — ตรวจสอบ `approval_substitutes` ที่ `is_active=true` และอยู่ในช่วงวันที่ปัจจุบัน แล้วส่ง email แจ้งเตือนไปหา substitute พร้อมระบุว่าเป็นการแทน primary approver คนใด

---

## 📦 บันทึกย้อนหลัง (Archives)

### มิถุนายน 2569 (June 2026)
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
*อัปเดตล่าสุด: 08-Jun-2026 12:00*
