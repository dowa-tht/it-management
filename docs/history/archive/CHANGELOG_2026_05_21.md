# 🕒 ประวัติการเปลี่ยนแปลง (Change Logs) - 21 พฤษภาคม 2569 (21-May-2026)

## 21 พฤษภาคม 2569 (21-May-2026)
- **18:01 +07:00 | MODULE: IT Checklist - Target Registry / Template Mapping Migration:**
  - ปรับ `checklist-template` action ให้เลิกใช้ `target_group_id` และรองรับการแมปแบบ `per_target` + `per_type` เท่านั้น
  - ปรับ `public-checklist` history lookup ให้เลิก query กลุ่มอุปกรณ์ และหา template จาก `target_id`/`target_type`
  - ถอด Group flow ออกจาก UI ของ Target Registry และปรับ contract ระหว่าง pages/components ไม่ให้ส่ง `initialGroups`/`targetGroups`
  - ปรับ `TemplateForm` ให้ถอด `per_group` ออก และคงเฉพาะ `global`, `per_target`, `per_type`
  - อัปเดต test `target-registry.test.js` ให้ใช้ `per_type` และรัน `npm test` ผ่าน 100% (12/12)
- **15:05 +07:00 | MODULE: IT Checklist - Template Builder Redesign:**
  - ย้ายปุ่ม Save Template ไปที่ด้านล่างสุดของแบบฟอร์ม (ใต้ `TemplateForm`) เพื่อความสะดวกและสอดคล้องกับพฤติกรรมผู้ใช้
  - ถอดกล่อง "Standards Snapshot" ที่ไม่จำเป็นสำหรับผู้ใช้ออกจากการแสดงผลทั้งหมด
- **14:40 +07:00 | MODULE: IT Checklist - Template Builder Redesign:**
  - พัฒนาโครงสร้างการดึงข้อมูล `target_type` แบบ dynamic จาก active targets/groups
  - พัฒนาระบบ collision check (การชนของความถี่เดียวกันรายอุปกรณ์/กลุ่ม) ทั้งบน client (TemplateForm) และ server-side action
  - เพิ่มช่อง override URL ของ T4 ราย target ใน behavior config
  - ถอดรูปแบบ T5 (Sign-off) ออกจาก base validation schema, preview, และ UI components ทั้งหมด
  - เพิ่มและรันเทสเคสครอบคลุมการยกเลิก T5 และการทำงานของ T4 ใน `tests/target-registry.test.js`
- **14:05 +07:00 | MODULE: IT Checklist - Template Builder Redesign:**
  - เริ่มตรวจสอบและสืบค้นความต้องการ พร้อมวางแผน Implementation Plan สำหรับ Checklist Template Builder
