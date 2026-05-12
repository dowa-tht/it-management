# Change Log - 09-May-2026

## [2026-05-09 16:30] - Scalable Workflow Engine Upgrade
- **Document Registry**: Introduced `lib/workflowRegistry.js` to centralize document-to-table mappings (Supports Incident, Checklist, and future modules).
- **Integer Routing**: Implemented normalization for workflow conditions (Severity 0-2, Frequency 0-3) for more robust routing logic.
- **Dual Signatures**: Upgraded Incident Resolve Dialog to require both IT Officer and Requester signatures with PIN verification.
- **SLA Standardization**: Fixed Low severity SLA Response target to 6 hours (360 mins) and centralized targets in the registry.
- **Backend Refactoring**: Decoupled `workflow.js` from hardcoded table names for better scalability.
- **Workflow Preview**: Added `getPotentialWorkflowSteps` to allow previewing approval routes before submission.
- **UI Enhancement**: Updated `WorkflowProgressBar` to support preview mode for better user transparency.
- **Standardization**: Fully aligned Incident and Checklist modules with the Document Registry pattern.

## [2026-05-09 16:18] - SLA Report Table UI Refinement
- **UI/UX**: ปรับปรุงหน้าตาราง SLA Report ให้เป็นระเบียบตามมาตรฐาน Premium
- **Header Refinement**: บังคับให้หัวคอลัมน์แสดงผลบรรทัดเดียว (`white-space: nowrap`) เพื่อลดความแออัดของหน้าจอ
- **Metric Refinement**: ปรับการแสดงผล Response และ Resolution SLA ให้แสดงผลในบรรทัดเดียว โดยรวมเอา ระยะเวลา, สถานะ (PASS/FAIL) และเป้าหมาย (Target) ไว้ด้วยกันในแนวนอน

## [2026-05-09 16:00] - SLA Strict Mode Implementation
- **Feature**: เปิดใช้งาน **Strict Mode** สำหรับการคำนวณ SLA ทั้งในหน้า Dashboard และ Reports
- **Logic**: เคสที่ยังไม่ได้รับงาน (`Open`) หรือยังไม่ปิดงาน (`In Progress`) หากเวลาที่ใช้ไปจนถึงปัจจุบันเกินกำหนด จะถูกนับเป็น **FAIL** ทันที เพื่อความแม่นยำในการวัดผลแบบ Real-time
- **Standardization**: อัปเดต `docs/standards/SLA_MANAGEMENT.md` และลบ Hardcoded logic ใน Server Actions เพื่อใช้มาตรฐานเดียวกันทั้งระบบ

## [2026-05-09 15:58] - Agent Workflow Hardening
- **Standardization**: อัปเดต `AGENTS.md` โดยเพิ่มข้อบังคับให้ Agent ต้องตรวจสอบบทบาท (Role) ของตัวเองใน `docs/standards/roles/` เป็นอันดับแรกก่อนเริ่มงานทุกครั้ง เพื่อให้ปฏิบัติหน้าที่ได้ตรงตามความคาดหวังของ USER

## [2026-05-09 14:20] - My Incidents Filter Hardening
- **Feature**: ปรับปรุงฟังก์ชัน "แสดงเฉพาะรายการของฉัน" (My Incidents) ในหน้ารายการ Incident
- **Robustness**: เปลี่ยนมาใช้ `reported_by_id` (UUID) เป็นเกณฑ์หลักในการกรอง เพื่อความแม่นยำสูงสุด
- **Logic**: เพิ่มการกรองเคสที่ผู้ใช้ได้รับมอบหมาย (`assigned_to`) และใช้ `.ilike` เพื่อให้ค้นหาชื่อ/อีเมลได้ยืดหยุ่นขึ้น (Case-insensitive)

## [2026-05-09 14:13] - SLA Percentage Calculation Fix
- **Bug Fix**: แก้ไขบั๊กเปอร์เซ็นต์ SLA เกิน 100% ในหน้า Dashboard และ Reports โดยปรับให้ตัวหาร (Denominator) และตัวเศษ (Numerator) ใช้เกณฑ์เดียวกันในการนับเคสที่ได้รับการตอบสนองแล้ว
- **Documentation**: เพิ่มรายละเอียดสูตรการคำนวณทางคณิตศาสตร์ใน `docs/standards/SLA_MANAGEMENT.md` เพื่อความโปร่งใส

## [2026-05-09 14:00] - SLA Standards & UI Overhaul
- **Standardization**: อัปเดตสูตร SLA (Low Response = 6 ชม.) ใน `lib/slaUtils.js` และ `docs/standards/SLA_MANAGEMENT.md`
- **UI/UX**: ปรับปรุงหน้าจอ SLA Guide ให้รองรับการกรอกแบบ "ชั่วโมง:นาที" และแสดงผลระยะเวลาในรูปแบบภาษาไทย ("X ชั่วโมง Y นาที")
- **Deployment**: ตรวจสอบความถูกต้องผ่าน `npm run build` สำเร็จ

## [2026-05-09 13:43] - SLA Standards Audit & Planning
- **Audit**: ตรวจสอบสูตรการคำนวณ SLA และพบจุดที่ไม่สอดคล้องกับมาตรฐานบริษัท (Mismatch in Response Targets & Resolution Start Point)
- **Standardization**: จัดทำแผนการแก้ไข SLA ใหม่ทั้งหมด (Low Response = 6 ชม.) และวางระบบการตั้งค่าแบบ Hour/Minute Setup ในหน้า Dashboard
- **Task**: บันทึกงานค้าง "SLA Standards & UI Overhaul" ลงใน `USER_TASKS.md` และจัดทำ Hand-off document ใน `REF_SLA_CALCULATION_FIX.md` เพื่อให้ Agent อื่นดำเนินการต่อได้

## [2026-05-09 13:38] - Quality Assurance Role Activation
- **Standardization**: อัปเดตรายละเอียดเฉพาะของโปรเจกต์ (Project-Specific Details) ลงใน `docs/standards/roles/Quality.md` โดยกำหนดขอบเขตการทดสอบ (Workflow, SLA, Security PIN) และเกณฑ์การ Go-Live ที่เน้นความถูกต้องของ Audit Logs และ Data Sync 100%

## [2026-05-09 13:36] - Developer Role Activation
- **Standardization**: อัปเดตรายละเอียดเฉพาะของโปรเจกต์ (Project-Specific Details) ลงใน `docs/standards/roles/Development.md` โดยกำหนด Tech Stack หลัก (Next.js, Supabase, Bcrypt) และแนวทางการพัฒนาแบบ Zero-Trust Security และ Trunk-based Integration ให้สอดคล้องกับโครงสร้างระบบปัจจุบัน

## [2026-05-09 13:31] - Designer Role Activation
- **Standardization**: อัปเดตรายละเอียดเฉพาะของโปรเจกต์ (Project-Specific Details) ลงใน `docs/standards/roles/Design.md` โดยกำหนดมาตรฐาน "Dowa Premium System" (20px Radius, Blue Primary), แพลตฟอร์ม Responsive Web, และข้อกำหนด Accessibility ให้สอดคล้องกับหน้างานจริง

## [2026-05-09 13:30] - Business Analyst Role Activation
- **Standardization**: อัปเดตรายละเอียดเฉพาะของโปรเจกต์ (Project-Specific Details) ลงใน `docs/standards/roles/BA.md` โดยสรุปขอบเขตงาน (Scope) ทั้ง 4 ส่วนหลัก, กลุ่ม Stakeholders, และข้อกำหนดทางธุรกิจ (Constraints/PIN/SLA) จากเอกสารสถาปัตยกรรมจริง

## [2026-05-09 11:13] - Project Management Role Activation
- **Standardization**: อัปเดตรายละเอียดเฉพาะของโปรเจกต์ (Project-Specific Details) ลงใน `docs/standards/roles/Project_Manager.md` โดยอ้างอิงข้อมูลจริงจากระบบ (Phase 1-3 Completion, Roles, Milestones)
- **Audit**: ตรวจสอบความสอดคล้องระหว่าง Deliverables ในโปรเจกต์กับมาตรฐานบทบาท PM

## [2026-05-09 11:10] - Documentation Infrastructure Update
- **Standardization**: สร้างโฟลเดอร์ `docs/standards/roles/` เพื่อรองรับการขยายตัวของบทบาท Agent (Sub-roles) ตามความต้องการของ USER
- **Documentation**: อัปเดต `docs/INDEX.md` เพื่อลงทะเบียนหมวดหมู่ Agent Roles ให้อยู่ภายใต้มาตรฐานการพัฒนาระบบ

## [2026-05-09 13:30] - Production Build & Push
- **Deployment**: ดำเนินการ `npm run build` ตรวจสอบความถูกต้องของระบบ และ `git push` งานทั้งหมดขึ้น GitHub เรียบร้อยแล้ว
- **Summary**: รวมงานสำคัญ (RBAC, UI Modernization, SLA Fix, Workflow v2) เข้าสู่ Branch หลัก

## [2026-05-09 10:28] - Running Development Server
- **Server**: เริ่มรัน localhost:3000 ให้ USER ตามคำขอ
- **Task Remind**: แจ้งเตือน USER เกี่ยวกับงานค้าง "Email Notification for Approvers"
