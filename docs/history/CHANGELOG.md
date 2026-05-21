# 🕒 ประวัติการเปลี่ยนแปลง (Change Logs)

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

---

## 📦 บันทึกย้อนหลัง (Archives)

### พฤษภาคม 2569 (May 2026)
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
*อัปเดตล่าสุด: 21-May-2026 18:01*
