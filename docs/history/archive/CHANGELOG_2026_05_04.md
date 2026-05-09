# Changelog Archive - 2026-05-04

### [2026-05-04] - UI Optimizations, Account Management Hardening & Workflow Planning
- **Persistent Sidebar Settings**: แก้ไข Logic การแสดงผลเมนูตั้งค่าใน Sidebar ให้ค้างอยู่ (Persistent) เมื่อมีการเปลี่ยนวันที่ปฏิบัติงานหรือกด Refresh เพื่อความต่อเนื่องในการใช้งาน
- **Dashboard Dynamic Card Styling**: ปรับปรุงการ์ด Checklist บน Dashboard (Weekly, Monthly, Yearly) ให้มีการแสดงผลสีเขียวและขอบเน้นเมื่อสถานะเป็น `done` เพื่อให้สอดคล้องกับมาตรฐานของ Daily Checklist
- **Account Management (Assignee Restore)**: 
  *   กู้คืนฟิลด์ **Assignee (can_be_assignee)** กลับมาในหน้าสร้างและแก้ไข User
  *   เพิ่มระบบ **Quick Action Toggle** ในตารางจัดการผู้ใช้ เพื่อให้ Admin สามารถสลับสถานะผู้รับมอบหมายงานได้โดยตรงจากหน้าลิสต์ (Optimistic UI Update)
  *   เพิ่มตัวบ่งชี้ไอคอน 👤 ในตารางหลักสำหรับผู้ที่มีสิทธิ์เป็น Assignee
- **Compact Settings Sidebar**: ปรับลดขนาดตัวอักษร (14px -> 13px) และระยะห่างแนวตั้ง (12px -> 10px) ของเมนูในหน้า Master Data/Settings เพื่อให้ดู Sleek และกะทัดรัดขึ้น
- **Approval Workflow Blueprint**: จัดทำ **Implementation Plan** สำหรับระบบอนุมัติงาน (Approval Workflow) และระบบผู้ช่วยอนุมัติแทน (Substitute Approver) เพื่อเตรียมความพร้อมสำหรับฟีเจอร์ Enterprise ในขั้นตอนถัดไป

---
*ย้ายข้อมูลเมื่อ 08-May-2026*
