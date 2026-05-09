# Changelog Archive - 2026-05-03

### [2026-05-03] - UI Refinement & Next-Gen Checklist Planning
- **DatePicker UX Improvement**: แก้ไขปัญหาการคลิก Datepicker ยากสำเร็จ 100% ในหน้า Master Data, SLA Report, Backup Log, No. Series และ Checklist โดยใช้ `showPicker()` API
- **Standardized Date Display**: ปรับรูปแบบการแสดงผลวันที่ทั่วทั้งระบบให้เป็น `dd-MMM-yyyy` (เช่น 30-Apr-2026) เพื่อความเป็นระเบียบและอ่านง่าย
- **Dynamic Checklist Architecture (Planned)**: ออกแบบสถาปัตยกรรมใหม่สำหรับระบบ Checklist ให้รองรับการเลือกแผนซ้อม IT (Drill Plans) และการตรวจตู้ CCTV แบบระบุรายการตู้ โดยใช้โครงสร้างข้อมูล JSONB
- **OneDrive Integration Strategy (Planned)**: วางแผนการเชื่อมต่อ Microsoft Graph API เพื่อเก็บรูปภาพหลักฐานไว้ใน OneDrive Shared Folder เพื่อประหยัดพื้นที่ Supabase
- **Image Compression System (Planned)**: เตรียมระบบบีบอัดรูปภาพฝั่ง Client ให้มีขนาดไฟล์ไม่เกิน 150kb ก่อนอัปโหลด เพื่อประสิทธิภาพสูงสุดในการใช้งาน

---
*ย้ายข้อมูลเมื่อ 08-May-2026*
