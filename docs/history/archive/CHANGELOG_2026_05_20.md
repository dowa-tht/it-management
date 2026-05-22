# 🕒 ประวัติการเปลี่ยนแปลง (Change Logs) - 20 พฤษภาคม 2569 (20-May-2026)

## 20 พฤษภาคม 2569 (20-May-2026)
- **08:42 +07:00 | PRODUCTION MIGRATION PLAYBOOK (DB/CODE DIFF CHECKLIST EXPANSION):**
  - ขยายคู่มือที่ [`docs/manuals/PRODUCTION_MIGRATION_PLAYBOOK.md`](docs/manuals/PRODUCTION_MIGRATION_PLAYBOOK.md) โดยเพิ่มหัวข้อ `DB Diff Checklist` และ `Code Diff Checklist` ในรูปแบบ severity `Critical / Warning / Optional`
  - เพิ่มรายการตรวจสอบเชิงปฏิบัติพร้อมเกณฑ์ `Pass/Fail` สำหรับการยืนยันความพร้อมก่อน production
  - เพิ่ม SQL ตัวอย่างสำหรับการตรวจ DB diff ในประเด็นสำคัญ เช่น schema coverage, RLS/policy coverage, index sanity, และ row-count sanity checks
  - ยืนยันข้อกำหนดโครงการใน checklist ได้แก่ Supabase migrations เป็น source of truth, ห้าม unauthorized schema changes, รักษา RLS/RBAC safety, approval flow ต้องผ่าน workflow กลาง, และ no UI hacks
- **14:37 +07:00 | MODULE: IT Checklist - Target Registry & Public QR Sessions:**
  - พัฒนาฟีเจอร์ Target Registry และการใช้งาน Public QR Checklist Point History & Photo Log
  - สร้างหน้าสาธารณะสำหรับการเข้าถึงและใช้งานระบบจากภายนอก
- **07:34 +07:00 | MODULE: Setup - Dynamic No. Series Mapping:**
  - อัปเกรดระบบจัดลำดับเลขเอกสาร (Dynamic No. Series Mapping) โดยอ่านค่าผ่าน API และตัดการใช้ Hardcoded Forms
  - ปรับปรุงให้ยืดหยุ่นและปลอดภัยจากการชนกันของเลขที่เอกสาร

## 19 พฤษภาคม 2569 (19-May-2026) - เพิ่มเติมช่วงเย็น
- **17:46 +07:00 | MODULE: Setup/Workflow - Fix missing approver_id column:**
  - ปรับปรุง `submitRequest` ใน `app/actions/workflow.js` ให้ใช้ `session.user.id` เป็นผู้อนุมัติเอกสาร กรณีที่เอกสารไม่มี Workflow Rules (autoApproved = true)
- **19:44 +07:00 | MODULE: Setup/Workflow - Workflow Config Modal and Role Validations:**
  - เพิ่มปุ่ม "+ เพิ่มเงื่อนไขใหม่" แบบมี Modal แทนของเดิมที่เป็น Coming Soon
  - ใน Modal มี 2 Tabs ได้แก่ Incident และ Checklist
  - แสดงรายการเงื่อนไขทั้งหมดตามประเภท (เช่น Low, Medium, High) และการ Disabled เงื่อนไขที่มีอยู่แล้ว
  - ซ่อน Dropdown "ระบุผู้อนุมัติเฉพาะเจาะจง" กรณีเลือก Role เป็น Dynamic Roles (Creator, Reporter)
  - บังคับการเลือก Dropdown "ระบุผู้อนุมัติเฉพาะเจาะจง" กรณีมี Role เหมือนกันใน Workflow เดียวกัน เพื่อความเสถียรของระบบ
