## [2026-05-08 17:45] - Incident Save Error Resolved
- **Fix**: แก้ไขปัญหา "Bad Request (400)" เมื่อกดบันทึกหน้า Incident Detail โดยการลบฟิลด์ `reporter` (Joined Object) ออกจาก Payload ก่อนส่งคำสั่ง `update` ไปยัง Supabase (Database Field Collision Fix)
- **Data Integrity**: ปรับปรุงการ Fetch ข้อมูลในหน้า Incident Detail ให้รองรับการ Join ข้อมูลชื่อผู้แจ้ง (Requester) และผู้รับผิดชอบ (Assignee) ให้ถูกต้องตามมาตรฐานที่ USER ต้องการ
- **Stability**: ตรวจสอบและยืนยันความเสถียรของระบบ Master Data และ No. Series ในส่วนของการ Update ข้อมูล เพื่อป้องกันปัญหาในลักษณะเดียวกัน

## [2026-05-08 17:40] - Premium UI/UX Modernization Overhaul
- **Dashboard**: ยกระดับ Dashboard เป็นมาตรฐาน Premium Enterprise:
    - **SLA Compliance Card**: ปรับโฉมเป็น Gradient Card พร้อมระบบเปลี่ยนสีตามเป้าหมาย (95% Green / 90% Orange / <90% Red) และ Target Marker
    - **IT Checklist Status**: ขยายขนาดจุดสถานะ (Interactive Dots) พร้อมเพิ่ม Legend และระบบ Click-to-Filter รายวัน
    - **Member Dashboard**: โอเวอร์ฮอลรายการ "แจ้งซ่อมล่าสุด" เป็น Card-based พร้อมไอคอนและสถานะสี (Visual Hierarchy)
- **Document Detail Pages**: ปรับปรุงหน้า Incident และ Checklist Detail เป็นระบบ Card-based layout เต็มรูปแบบ:
    - เพิ่มปุ่ม **Back Navigation** มาตรฐานเพื่อให้ใช้งานง่าย (Usability)
    - รองรับ Responsive แบบ Grid-based (Smartphone & Tablet) 100%
- **SLA Report**: ปรับปรุงหน้าจอรายงาน SLA ให้ใช้ Concept สีเดียวกับ Dashboard และแก้ไข Layout ตาราง (Case ID) ให้แสดงผลในบรรทัดเดียว

## [2026-05-08 17:37] - Severity UI Minor Adjustment
- **UI Refinement**: ปรับพื้นหลังของช่องเลือก Severity ให้เป็นสีขาว (#fff) ตามความต้องการของ USER เพื่อให้ดูสะอาดตาและอ่านง่ายขึ้น โดยยังคงเส้นขอบ (Border) ตามสีความรุนแรงไว้

## [2026-05-08 17:36] - Severity UI/UX Polish
- **UI Enhancement**: ปรับปรุงหน้าตา Dropdown การเลือก Severity ให้มีสีสันและไอคอนสอดคล้องกับระดับความรุนแรง (🔴 High / 🟠 Medium / 🟢 Low)
- **Visual Feedback**: เพิ่มระบบเปลี่ยนสี Border และ Background ของ Dropdown ตามค่าที่เลือกแบบ Real-time เพื่อลดความผิดพลาดในการเลือก

## [2026-05-08 17:35] - Incident Severity Management Improvement
- **Feature**: เปิดให้ IT/Admin สามารถแก้ไข **Severity** ในหน้า Incident Detail ได้เพื่อแก้ไขข้อมูลที่ผิดพลาด
- **Audit Compliance**: เพิ่มระบบ **Auto-Logging** เมื่อมีการเปลี่ยน Severity ระบบจะบันทึก Log ลง `system_audit_logs` อัตโนมัติ (Zero-Hack Compliance)
- **UI/UX**: แสดงผลเป็น Dropdown เฉพาะในโหมดแก้ไข และจำกัดสิทธิ์เฉพาะผู้ดูแลระบบ

## [2026-05-08 15:52] - Workflow UI/UX Planning & Phase 2 Completion
- **Completion**: ยืนยันความสมบูรณ์ของ **Workflow Refinement Phase 2** (Atomic Transactions & Centralized Logs) และอัปเดตสถานะใน `USER_TASKS.md` เป็นเสร็จสิ้น
- **Planning**: จัดทำแผน [UI_UX_WORKFLOW_CARD_UPGRADE.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/UI_UX_WORKFLOW_CARD_UPGRADE.md) เพื่อยกระดับหน้าจอเป็นแบบ Card View ใน Phase 3
- **Maintenance**: ลงทะเบียนเอกสารใหม่ใน `INDEX.md` และอัปเกรดมาตรฐาน `WORKFLOW_ENGINE.md` ให้ครอบคลุมระบบใหม่

## [2026-05-08 15:35] - Workflow Refinement Phase 2 (Implementation)
- **Database Architecture**: สร้างตาราง `system_audit_logs` และ RPC Function `handle_approval_step` สำหรับ Transactional Workflow
- **Refactor Workflow Engine**: ปรับปรุง `submitApprovalStep` ให้ทำงานแบบ Atomic ผ่าน RPC และรวมศูนย์การบันทึก Log
- **UI Synchronization**: อัปเดตหน้าจอ Dashboard และรายละเอียดเอกสาร (Incident/Checklist) ให้ใช้ระบบ Logging ใหม่ 100%
- **System Integrity**: เพิ่มการบันทึก Error ลง `system_logs` และปรับปรุงความเสถียรของ Server Actions

## [2026-05-08 15:25] - Workflow Refinement Phase 2 Planning
- **Planning**: จัดทำแผน [WORKFLOW_REFINEMENT_PHASE_2.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/WORKFLOW_REFINEMENT_PHASE_2.md) เพื่อยกระดับความเสถียรของระบบ Workflow
- **Key Focus**: แผนการใช้ Database Transactions สำหรับการอนุมัติ และการยุบรวม Log เข้าสู่ตารางกลาง (Centralized Audit Logs)
- **Maintenance**: ลงทะเบียนแผนงานใหม่ใน `INDEX.md` และอัปเดตรายการงานค้างใน `USER_TASKS.md` เรียบร้อย

## [2026-05-08 15:10] - Security Hardening & Unified Logging
- **Security**: ปิดช่องโหว่ PIN Verification Loophole โดยบังคับเช็ค PIN ที่ Server เสมอสำหรับ Remote Approval
- **Logging**: เพิ่มฟังก์ชัน `recordAuditLog` เป็นมาตรฐานกลางเพื่อเตรียมยุบรวม Log ในอนาคต
- **State Management**: ปรับปรุงลำดับการอัปเดตเอกสารใน `submitApprovalStep` ให้มีความเสถียรสูงสุด
- **Documentation**: อัปเดตสถานะงานใน `UNIFIED_WORKFLOW_STANDARD_PLAN.md` เป็นเสร็จสมบูรณ์ใน Phase หลัก

## [2026-05-08 14:35] - Unified Workflow Standardization
- [x] **Unified Workflow Standardization**: ปรับปรุงระบบ Approval และ Workflow ทั้งระบบให้เป็นมาตรฐานเดียวกัน (Done: รวมศูนย์ Engine, ปิดช่องโหว่ PIN, และวางรากฐาน Log กลางเรียบร้อย)
- **Initiated**: แผนการปรับปรุงมาตรฐาน Workflow ทั้งระบบให้เป็นหนึ่งเดียว (Unified Workflow Standard)
- **Design**: กำหนดมาตรฐานการอนุมัติแบบ Step-by-Step (Checklist Base) สำหรับ Incident และโมดูลอื่นๆ ในอนาคต
- **Components**: ออกแบบ Shared UI Components สำหรับ Workflow Progress, Action Bar และ Unified Signature Modal
- **Documentation**: สร้าง [UNIFIED_WORKFLOW_STANDARD_PLAN.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/UNIFIED_WORKFLOW_STANDARD_PLAN.md) และลงทะเบียนใน Index เรียบร้อย

### [2026-05-08 14:20] - Supabase Admin Authentication Fix & Environment Standardization
- **Critical Fix: Missing Credentials**: Resolved a persistent `Missing Supabase Admin credentials` error by adding the missing `'use server'` directive to `app/actions/admin.js`.
- **Architectural Hardening**:
    - **`lib/supabaseAdmin.js`**: Refactored the admin client initialization with a singleton pattern and robust error handling.
    - **`lib/envLoader.js` [NEW]**: Implemented a server-side filesystem fallback to ensure environment variables are loaded even if `process.env` is empty during Turbopack execution.
- **System-wide Synchronization**: Updated `lib/resend.js` and all administrative Server Actions to use the new unified admin utility.
- **Documentation**: 
    - Created `docs/standards/ENVIRONMENT_AND_SERVER_ACTIONS.md` to define mandatory practices for Server Actions and environment handling.
    - Updated `docs/INDEX.md` to register the new security standard.

### [2026-05-08 11:45] - User Management Hardening (Security Phase)
- **Admin Audit Logs**: Implemented comprehensive auditing for administrative actions (Create/Update/Delete User, PIN management).
- **Guest Auto-Deactivate**: Automated account lifecycle management for Auditors (Guest accounts) with auto-deactivation upon expiry.
- **PIN Lockout Hardening**: Standardized 30-minute server-side lockout for both Signature PINs and Guest Login PINs.
- **Database Schema**: Added `admin_audit_logs` table and lockout tracking columns to `external_users`.

### [2026-05-08 11:38] - SLA Calculation Fix (Working Hours Alignment)
- **Working Hours Adjustment**: Corrected "3 working days" SLA limit from 4,320 minutes (24h/day) to **1,620 minutes** (9h/day) to align with company KPI.
- **System-wide Synchronization**: 
    - Updated `lib/slaUtils.js` for backend calculations.
    - Updated `Incident Detail` and `New Incident` pages for consistent frontend display.
    - Updated `SLA Report` page guidance to reflect the new 1,620-minute threshold.
- **Dashboard Integration**: 
    - Refactored `app/dashboard/page.js` to use `calculateNetBusinessMinutes` for real-time SLA tracking.
    - Synchronized `SLA_MINUTES` constants in the main dashboard to match the new 1,620-minute standard.
    - Updated `getDashboardData` server action to provide necessary working hours and holiday data to the frontend.

### [2026-05-08 09:50] - Standardized RBAC & Permission Migration (Full Completion)
- **Standardized Role Hierarchy**: Fully transitioned the system to the new 5-tier RBAC standard: `admin`, `it_staff`, `employee`, `auditor`, and `approver`.
- **Dashboard & Aggregation Hub**:
    - Refactored `app/dashboard/page.js` and `app/actions/dashboard.js` to replace legacy `member` checks with `employee` role for personalized stats.
    - Updated `auditor` role to have read-only access to SLA reports and checklist lists across all modules.
- **Workflow & Approval Settings**:
    - **Approval Flows**: Updated `app/dashboard/settings/approvals/page.js` to support new roles in the primary approver selection and allowed roles pool.
    - **Workflow Steps**: Updated `app/dashboard/settings/workflow/page.js` with the new role array and set `it_staff` as the default step role.
    - **Substitutes**: Updated `app/dashboard/settings/substitutes/page.js` to allow delegating approval authority to `admin`, `it_staff`, or `approver` roles.
- **Incident & Checklist Security Hardening**:
    - **Auditor Access**: Replaced legacy `visitor` checks with `auditor` in `incidents/[id]/page.js` and `checklist/page.js` for strict read-only enforcement.
    - **Admin Elevation**: Authorized the new `admin` role to perform high-privilege actions like **Reopen Cases**, **Reset Workflows**, and **Edit SLA Settings**.
- **User Management & Documentation**:
    - Updated User Management settings to support all 5 tiers.
    - Revised `Account Management Guide` to reflect the professional naming conventions of the new RBAC structure.
- **Zero-Hack Compliance**: Performed a global search-and-replace to ensure all remaining legacy role strings (`visitor`, `superuser`, `member`) are either migrated or aliased for backward compatibility.

### [2026-05-08 09:10] - Backup Log Pagination & UI Refinement
- **Load More Pagination**: Implemented 20-item chunk loading for Backup Logs to improve performance and usability on long lists.
- **Filter-Aware Stats**: Fixed summary cards to calculate totals from the entire filter period (Supabase `count`) instead of only the currently visible paginated logs.
- **Premium Table UI Upgrade**:
    - Added **Sticky Table Header** with glassmorphism support for better context while scrolling.
    - Implemented **Row Hover States** and refined border styling for a cleaner look.
    - Added **Custom Slim Scrollbars** for the scrollable table area.
    - Enhanced table container with `max-height` to prevent page-level over-scrolling.
- **Consistency**: Synchronized the "Load More" logic with other document modules for a unified user experience.

### [2026-05-08 09:01] - Refactor Incident Creation Flow (Zero-Hack Compliance)
- **[NEW ACTION] `app/actions/incidents.js`**: สร้าง Server Action `createIncident` เพื่อย้าย Logic การบันทึกข้อมูลจาก Client-side ไปยัง Server-side ทั้งหมดตามมาตรฐานความปลอดภัย
- **[REFACTOR] `app/dashboard/incidents/new/page.js`**: 
    - เปลี่ยนมาเรียกใช้ `createIncident` (Server Action) แทนการใช้ Supabase Client โดยตรง
    - ลบ Logic การจัดการเลขที่เอกสาร (No Series) และการบันทึก Logs ออกจาก Frontend เพื่อให้ Server Action จัดการแบบ Transaction เดียว
- **[INTEGRATION] Unified Workflow**: เชื่อมต่อระบบการสร้าง Incident เข้ากับ `generateWorkflowSteps` อัตโนมัติ เพื่อเริ่มกระบวนการอนุมัติตามระดับ Severity ทันทีที่สร้างเคส
- **[COMPLIANCE]**: ดำเนินการตามแผน [REF_INCIDENT_CREATION_FLOW.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/REF_INCIDENT_CREATION_FLOW.md) เพื่อรองรับนโยบาย Zero-Hack

### [2026-05-08 08:25] - Project Checker: User Management Audit & Documentation
- **[NEW MANUAL] `docs/manuals/USER_MANAGEMENT_GUIDE.md`**: จัดทำคู่มือระบบจัดการผู้ใช้แบบครบวงจร ครอบคลุมการเพิ่มผู้ใช้แบบ Admin/Quick Add, มาตรฐานความปลอดภัย (Double-Lock Whitelist), และขั้นตอน Onboarding
- **[AUDIT] User Security Verification**: 
    - ตรวจสอบระบบ Whitelist (Double-Lock) พบว่าทำงานถูกต้องตามมาตรฐาน (SHA-256 Hashing)
    - ตรวจสอบระบบ Gatekeeper (Proxy + Cookie) พบว่าสามารถสกัดกั้นการเข้าถึง Dashboard ก่อน Onboard ได้ 100%
    - ตรวจสอบหน้า Onboarding พบการบังคับ Password Complexity และ Signature PIN ตามกฎ IT Audit
- **[UPDATE] `docs/INDEX.md`**: เพิ่มลิงก์ไปยังคู่มือ User Management ใหม่

### [2026-05-08 08:20] - Project Checker: Workflow Documentation & Manuals
- **[NEW MANUAL] `docs/manuals/WORKFLOW_GUIDE.md`**: จัดทำคู่มือระบบ Workflow แบบละเอียด แสดงขั้นตอนการทำงาน (Flow), เงื่อนไข (If/Else), การตรวจสอบ PIN และการซิงค์ข้อมูลข้าม Module (Incident -> Checklist)
- **[UPDATE] `docs/standards/WORKFLOW_ENGINE.md`**: เพิ่มรายละเอียดตาราง `approval_configs` (Section 1.3) ซึ่งใช้สำหรับกำหนดผู้อนุมัติหลัก (Primary Approver) ตามความถี่หรืองาน ที่ตกหล่นในเอกสารเดิม
- **[UPDATE] `docs/INDEX.md`**: เพิ่มหมวดหมู่ "4. Manuals & Guides" เพื่อรวบรวมคู่มือการใช้งานระบบ และเพิ่มลิงก์ไปยังคู่มือ Workflow ใหม่
- **[VERIFICATION]**: ตรวจสอบ Logic ใน `app/actions/workflow.js` พบว่าทำงานสอดคล้องกับมาตรฐาน (Evidence: `applySignaturesToWorkflow` จัดการ Auto-consume ลายเซ็นในช่วง Resolve ได้ถูกต้อง)
