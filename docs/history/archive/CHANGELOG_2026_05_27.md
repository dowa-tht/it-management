# 🕒 ประวัติการเปลี่ยนแปลง (Archived)

## 27 พฤษภาคม 2569 (27-May-2026)

- **[22:11 ICT]** Phase 1 เสร็จสมบูรณ์: พัฒนาหน้าจอตั้งค่ากลาง SLA Settings (UI read-only) ที่ `/dashboard/settings/sla`
- **[22:14 ICT]** Phase 2 เสร็จสมบูรณ์: เพิ่มเมนู `SLA Settings` ภายใต้ `System Setup` ใน sidebar ของ [layout.js](file:///c:/Users/Lenovo/dowa-it-system/app/dashboard/layout.js) และตั้งเงื่อนไข auto-expand เมื่ออยู่หน้านี้
- **[22:23 ICT]** Phase 3 เสร็จสมบูรณ์: ลบฟังก์ชันแก้ไขและบันทึก SLA targets ออกจาก modal ในหน้า SLA Report [page.js](file:///c:/Users/Lenovo/dowa-it-system/app/dashboard/reports/sla/page.js) เปลี่ยนให้เป็น read-only view และปุ่มนำทางชี้ไปที่หน้า SLA Settings เพื่อยึดหลัก Single Source of Truth
- **[22:24 ICT]** รันและตรวจสอบระบบผ่าน `npm test` (ผลลัพธ์ผ่าน 12/16 tests เท่ากับสถานะเดิมก่อนแก้ไข ไม่พบคลิกส์หรือ regression ใหม่) พร้อมอัปเดตสถานะในเอกสารแผนงาน [IMPLEMENTATION_PLAN_UNIFIED_SLA_SETTINGS_AND_CALCULATION.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/IMPLEMENTATION_PLAN_UNIFIED_SLA_SETTINGS_AND_CALCULATION.md)
