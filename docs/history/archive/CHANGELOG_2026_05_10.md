# Change Log - 2026-05-10

## [2026-05-10 21:10] - Incident Sequence Generation Fix
- **Fix**: แก้ไขปัญหา `duplicate key value violates unique constraint "incidents_case_number_key"` ในการสร้างเคสใหม่
- **Architecture**: ย้ายการรันเลขที่เอกสารไปทำที่ Server-side (Server Action) ทั้งหมด เพื่อให้ใช้สิทธิ์ Service Role ในการเช็คเลขล่าสุดข้ามข้อจำกัด RLS
- **Performance**: ปรับปรุง `lib/noSeries.js` ให้รองรับการฉีด Supabase Client เพื่อความยืดหยุ่นในการใช้งาน

## [2026-05-10 21:05] - Approval Setup Fix & RLS Bypass
- **Fix**: แก้ไขปัญหา RLS Violation ในหน้าจอ Approval Flows โดยการย้าย Logic ไปที่ Server Action
- **Security**: เปลี่ยนจาก Client-side Upsert เป็น Server-side `updateApprovalConfig` เพื่อความปลอดภัยและรองรับสิทธิ์ Admin
- **Audit**: เพิ่มระบบบันทึก Audit Log อัตโนมัติเมื่อมีการเปลี่ยนแปลงผู้อนุมัติหลัก

## [2026-05-10 20:50] - Transparency UI Overhaul & Approver Preview
- **UI/UX**: ปรับปรุง `WorkflowProgressBar` ให้แสดงเป็นกล่องรายละเอียดการอนุมัติ (Transparency Box) ที่ชัดเจนและพรีเมียม
- **Feature**: เพิ่มระบบ **Approver Preview** แสดงรายชื่อผู้อนุมัติล่วงหน้าแม้ยังไม่ได้ส่งอนุมัติ (รวมถึงการดึงชื่อผู้แจ้งมาแสดงอัตโนมัติ)
- **Engine**: อัปเดต `getPotentialWorkflowSteps` ให้ Join ข้อมูลกับ `user_profiles` เพื่อแสดงชื่อจริงผู้อนุมัติ

## [2026-05-10 20:45] - Workflow Engine & UI Model Alignment
- **Feature**: รองรับการอ่านขั้นตอนการอนุมัติแบบ JSONB จากตาราง `workflow_configs`
- **Fix**: แก้ไขปัญหา Engine ไม่อ่านข้อมูลที่ตั้งค่าจากหน้าจอ (เนื่องจาก UI เก็บเป็น JSONB แต่อุปกรณ์เดิมเช็คแบบแยกบรรทัด)
- **Consistency**: เชื่อมโยงระบบการตั้งค่าในหน้า Master Data ให้ทำงานร่วมกับ Workflow Engine ได้อย่างสมบูรณ์

## [2026-05-10 20:40] - Workflow Auto-Approval Bug Fix (Critical)
- **Bug Fix**: แก้ไขปัญหาเอกสารถูกปิด (Closed) อัตโนมัติแม้ไม่ได้ใส่ PIN เนื่องจากระบบไปเช็ค Logic เก่าใน `approval_configs`
- **Engine Refinement**: ปรับปรุงให้ `submitRequest` ยึดตามลำดับขั้นตอนใน Unified Workflow (`workflow_configs`) เป็นหลัก 100%
- **Logic Correction**: เมื่อส่งงานแบบไม่ใส่ PIN สถานะจะค้างที่ `Pending Approval` เพื่อรอผู้แจ้งตรวจสอบตามที่ออกแบบไว้

## [2026-05-10 20:30] - Incident Lifecycle Management Overhaul
- **UI/UX**: ปรับปรุงหน้าจอสร้าง Incident ใหม่ให้เรียบง่าย (Simplified Creation) โดยเก็บเฉพาะข้อมูลสำคัญจากผู้แจ้ง
- **Workflow**: เพิ่มขั้นตอน **Acknowledge** เพื่อให้ IT Staff ยืนยันการรับงานและเริ่มนับ SLA อย่างเป็นทางการ
- **Resolution**: ปรับปรุงการส่งงาน (Resolve) ให้รองรับทั้งแบบ **Face-to-face** (ใส่ PIN เพื่อปิดงานทันที) และ **Remote** (รอผู้แจ้งมา Approve เอง)
- **Standardization**: ปรับสถานะ (Status Mapping) ให้เป็นไปตามมาตรฐาน `DOCUMENT_MAPPING_STANDARD.md`


## [2026-05-10 20:15] - Incident Assignment Schema Fix
- **Database Schema**: Added `assigned_to_id` (UUID) to `incidents` table to align with `DOCUMENT_MAPPING_STANDARD.md`.
- **Documentation**: Updated `INCIDENT_MANAGEMENT.md` and `INCIDENT_LIFECYCLE_OVERHAUL_SPEC.md` to standardize assignee identity tracking (Text + ID).
- **Bug Fix**: Resolved "Column not found" error during the Acknowledge phase in the Incident module.
