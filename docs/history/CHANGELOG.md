### [2026-05-08 08:20] - Project Checker: Workflow Documentation & Manuals
- **[NEW MANUAL] `docs/manuals/WORKFLOW_GUIDE.md`**: จัดทำคู่มือระบบ Workflow แบบละเอียด แสดงขั้นตอนการทำงาน (Flow), เงื่อนไข (If/Else), การตรวจสอบ PIN และการซิงค์ข้อมูลข้าม Module (Incident -> Checklist)
- **[UPDATE] `docs/standards/WORKFLOW_ENGINE.md`**: เพิ่มรายละเอียดตาราง `approval_configs` (Section 1.3) ซึ่งใช้สำหรับกำหนดผู้อนุมัติหลัก (Primary Approver) ตามความถี่หรืองาน ที่ตกหล่นในเอกสารเดิม
- **[UPDATE] `docs/INDEX.md`**: เพิ่มหมวดหมู่ "4. Manuals & Guides" เพื่อรวบรวมคู่มือการใช้งานระบบ และเพิ่มลิงก์ไปยังคู่มือ Workflow ใหม่
- **[VERIFICATION]**: ตรวจสอบ Logic ใน `app/actions/workflow.js` พบว่าทำงานสอดคล้องกับมาตรฐาน (Evidence: `applySignaturesToWorkflow` จัดการ Auto-consume ลายเซ็นในช่วง Resolve ได้ถูกต้อง)

### [2026-05-08 08:05] - Unified Workflow Execution (Phase 1-3)
- **[REFACTOR] `app/dashboard/incidents/[id]/page.js`**: 
    - **Step 1.1**: สร้าง `unifiedHistory` State และ `useEffect` เพื่อ Merge ข้อมูลจาก `logs` และ `workflowSteps` แสดงผลแบบ Timeline ที่ L1249
    - **Step 1.2**: ลบส่วนแสดงผล Signature Grid (L1232-1250) เพื่อลดความซ้ำซ้อน
    - **Step 2.1**: แก้ไข `handleResolve` (L755) เลิกเขียนลายเซ็นลงตาราง `incidents` โดยตรง (Double Writing)
    - **Step 2.2**: แก้ไข `handleReopen` (L828) ให้เรียกใช้ `resetDocumentWorkflow` ก่อนอัปเดตสถานะหลัก
    - **Step 2.3**: แก้ไข `handleRejectIncident` (L816) ให้เรียกใช้ `rejectDocumentWorkflow` แทนการอัปเดตตาราง Manual
    - **Step 3.1**: จำกัด Status Options ใน `field` Helper (L1064) เหลือเพียง 'Open' และ 'In Progress' (Zero-Hack Guard)
- **[NEW ACTION] `app/actions/workflow.js`**:
    - เพิ่ม `resetDocumentWorkflow` เพื่อลบประวัติการอนุมัติใน `document_approvals`
    - เพิ่ม `rejectDocumentWorkflow` เพื่อจัดการการตีกลับเอกสารในระบบ Unified
    - อัปเดต `adminResetWorkflow` ให้เรียกใช้การล้างข้อมูลในตาราง Workflow ด้วย
- **[PROGRESS]** ดำเนินการตาม [workflow_unification_plan.md](file:///C:/Users/Lenovo/.gemini/antigravity/brain/9b767f56-b86e-452e-bf77-74893a5c789d/implementation_plan.md) เสร็จสมบูรณ์ 100% (ดูรายละเอียดใน [task.md](file:///C:/Users/Lenovo/.gemini/antigravity/brain/9b767f56-b86e-452e-bf77-74893a5c789d/task.md))

### [2026-05-07 22:30] - Documentation & Agent Standards Update
- **[WORKFLOW_ENGINE.md]** เพิ่ม 3 Section ใหม่ที่เป็น Mandatory Standard:
  - **§10 Incident Resolve & Auto-Approve**: กำหนดลำดับขั้นตอนการ Resolve + Auto-consume ลายเซ็น + Anti-patterns ที่ห้ามทำ
  - **§11 Reporter Identity**: บังคับให้ Incidents มี `reported_by_id` (UUID), ใช้ Live JOIN สำหรับแสดงชื่อ, PIN Verification Lookup Order
  - **§12 Approval Audit Log**: กำหนดมาตรฐานว่าต้องแสดง 1 บรรทัดต่อ 1 Sequence Step
- **[AGENTS.md]** เพิ่ม Rule ข้อ 7 **[EVIDENCE-BASED VERIFICATION]**:
  - บังคับ AI อ่านไฟล์จริงก่อนตอบคำถามการตรวจสอบ ห้ามตอบจากความจำ
  - คำตอบต้องอ้างอิงชื่อไฟล์ + หมายเลขบรรทัด + โค้ดจริง
  - ต้องเปรียบเทียบกับมาตรฐานใน `docs/standards/` โดยระบุ Section
  - ห้ามตอบแบบ "น่าจะ" และต้องรายงานตามความจริงเสมอ


- **[NEW] `getApprovalAuditLog()` Server Action** (`workflow.js`): ดึงข้อมูลทุก Row ใน `document_approvals` (approved / pending / waiting) พร้อม JOIN ชื่อเอกสารจาก `incidents` และ `checklist_docs` และ JOIN ชื่อผู้อนุมัติจาก `user_profiles`
- **[REDESIGN] หน้า `/dashboard/approvals`**: ปรับเป็น 2-Tab Layout:
  - **Tab "รออนุมัติ"**: Queue เดิม (ไม่เปลี่ยนแปลง Logic)
  - **Tab "ประวัติการอนุมัติ"**: แสดง 1 บรรทัดต่อ 1 Sequence — เห็นทุก Step ของทุกเอกสารพร้อมกัน
- **Filter**: กรองด้วย Status Pill (อนุมัติแล้ว / รออนุมัติ / รอลำดับก่อน), ประเภทเอกสาร, และ Keyword Search
- **Summary Pills**: แสดงจำนวนแต่ละสถานะ สามารถกด Filter ได้ทันที


> **Objective**: แก้ไขให้การ Resolve Incident เชื่อมกับ `document_approvals` โดยตรง ไม่ต้องเซ็นซ้ำซ้อน
- **[PHASE 1] Backend `workflow.js`**: `applySignaturesToWorkflow()`, Log ต่อ Step, Auto-Close
- **[PHASE 2] Frontend `incidents/[id]/page.js`**: `handleResolve()` ส่ง `initialSignatures`, Log สะท้อนสถานะจริง
- **[PHASE 3 + BUG FIX] `reported_by_id` Chain**:
  - ลบ `full_name` fallback ออกจาก `verifyMemberPIN` (ZERO_HACK_POLICY)
  - แก้ `new/page.js` บรรทัด 190: Include `reported_by_id` ใน Insert แทนการ Destructure ทิ้ง
  - สร้าง + รัน `scripts/migration_reported_by_id.sql`: ADD COLUMN + Backfill (7/16 สำเร็จ, 9 เป็น Test data)
- **[IMPROVEMENT] Live JOIN Reporter**:
  - `fetchIncident()` JOIN `user_profiles` ผ่าน `reported_by_id` → ชื่อผู้แจ้งเป็น Real-time เสมอ แม้มีการเปลี่ยน `full_name`
  - `handleResolve` ดึง `reporter.email` จาก JOIN มาใช้ใน Audit Log (UUID + Email + Name)

### [2026-05-07 21:20] - Member Dashboard Fixes & Layout Refinement
- **Critical Fix: Member Stats & Charts**: Resolved an issue where stats and charts showed zero/empty by including `full_name` in the user profile query and synchronizing data filters.
- **UI Refinement: Recent Activity**: Updated the layout of "My Recent Requests" to a single-column stack (1 item per row) as requested, improving readability on all devices.
- **Improved Data Accuracy**: Ensured all personal metrics match the global incident list by using a unified filtering logic (ID + Email + Full Name).

### [2026-05-07 21:15] - Member Dashboard Redesign & Personalized UX
- **Redesigned Member Dashboard**: Implemented a completely separate dashboard view for users with the `member` role, focusing on personal data and clarity.
- **Personalized Stats**: Added 4 premium status cards for members (Total, In Progress, Wait Confirm, Closed).
- **Advanced Data Visualization**: Added **Incident Trend** (BarChart) and **Category Breakdown** (PieChart) for personal history.
- **Actionable UI**: Status cards now lead to filtered Incident list views.
- **Navigation Sync**: Updated `IncidentsPage` to handle `filter=my` and `status` parameters from dashboard links.
- **Server Action Optimization**: Enhanced `getDashboardData` with specific member statistic computation.

### [2026-05-07 21:05] - Standardization & Documentation Sync
- **Official System Standards**: Formalized the following logic into `docs/standards/`:
    - **Incident Lifecycle Management**: Added to `WORKFLOW_ENGINE.md` to enforce automatic status transitions.
    - **Identity & Filtering Standard**: Added to `DEVELOPMENT.md` to standardize name-first display and robust personal data filtering.
- **Documentation Sync**: Verified and updated `docs/INDEX.md` to ensure all new standards are properly linked and categorized.

### [2026-05-07 17:48] - Personalized Workflow & UX Refinement
- **Automatic Status Flow**: Replaced the manual Status dropdown in the "New Incident" form with an automatic badge. Status now transitions from **Open** to **In Progress** based on the presence of an assignee, ensuring workflow integrity.
- **Identity Priority**: Updated the "Reported By" field logic to prioritize the user's **Full Name** over their email address for a more professional and readable identity.
- **Universal 'My Incidents' Filter**: Added a persistent checkbox to the Incident Management page for all roles, allowing instant toggling between global and personal incident lists.
- **Dashboard: Enhanced Request Tracking**: Fixed and optimized the "My Recent Requests" section on the dashboard. The filter now intelligently matches the user's Full Name and Email against the database to ensure personal tickets are never missed.
- **Schema-Aware Filtering**: Adjusted server-side and client-side queries to use available database columns (`reported_by`) instead of non-existent ID columns, resolving filtering issues.
- **Auto-Default Reporter**: The "New Incident" form now automatically defaults the **Reported By** field to the currently logged-in user's full name.
- **Status Flow Enforcement**: Replaced the manual Status dropdown with an automatic badge that reflects the internal state (Open/In Progress) based on assignments.
- **Identity Linkage**: Improved internal data consistency by automatically setting the `created_by` and `reported_by_id` fields.
- **Full System Validation**: Verified all Quick Filters (Today, 7D, 30D, Month, 3M, Year) are functioning correctly across all modules with precise timezone handling and instant SWR responses.
- **Critical Bug Fix: Dashboard Approval Count**: 
    - Resolved a destructuring error in `getDashboardData` where the "Approvals" badge incorrectly displayed the count of Checklist Templates (13) instead of actual pending tasks.
    - Verified that the badge now strictly follows RBAC rules: showing ONLY documents assigned to the user or their role.
- **Timezone-Safe Date Filtering**:
    - Fixed a bug where "เดือนนี้" (This Month) filter selected the previous month's end date due to UTC conversion (shifting by 1 day).
    - Standardized `toLocaleDateString('en-CA')` (YYYY-MM-DD) across **Incident, Backup, Checklist, and SLA Report** modules for perfect timezone alignment.
- **UX Excellence: Active Filter Highlighting**: 
    - Implemented a high-visibility "Active State" for all Quick Date Filters. 
    - Selected filters are now highlighted with a **Solid Blue background (`#1d4ed8`) and Bold White text**, providing clear visual feedback on the current data scope.
    - Applied consistently across all 4 main dashboard modules.
- **Data Integrity**: Refined `getDashboardData` to ensure `startIso` (30-day window) is also consistent with local time expectations.

- **UI Standard Maintenance**: Reverted all Sidebar and Page Titles to original standards (`Dashboard`, `Incident Management`) to ensure consistency across all user roles and prevent confusion during role transitions.

### [2026-05-07 16:30] - IT Checklist Compliance Status Logic Fix (Dashboard)
- **Logic Overhaul: Aggregated Compliance Tracking**: 
    - Replaced the "Single Document" check logic with an **Aggregation Engine** in `getDashboardData`.
    - Status now reflects the progress of **all unique tasks** defined in `checklist_templates` for a given frequency and period.
    - Status "Checked completely" (ตรวจครบถ้วน) now correctly requires all items to be in **Closed** documents.
- **Improved Transparency**: 
    - Added "Under Inspection" (กำลังตรวจสอบอยู่) status to clearly indicate when some tasks are finished but others remain pending.
    - Synchronized this logic across **Daily, Weekly, Monthly, and Yearly** compliance boxes.
- **Data Integrity**: 
    - Updated `checklist_items` fetch to include `item_key` for precise item-to-template mapping.
    - Implemented a fallback mechanism to static template counts if the database table is unavailable.

### [2026-05-07 16:50] - System-Wide Performance & UX Mastery
- **Enterprise-Grade Pagination (Load More)**: 
    - Implemented a "Load More" mechanism (20 items/page) across **Incidents, SLA Report, Backup Log, and IT Checklist**.
    - This significantly reduces initial load times, memory consumption, and database strain for high-volume environments.
- **Enhanced Data Filtering**:
    - Standardized Quick Date Filters (Today, 7 days, 30 days, Month, etc.) across all 4 main modules.
    - Replaced the restricted Month Picker in **Backup Log** with a more flexible Date Range system.
- **Universal Manual SWR Caching**:
    - Implemented the Stale-While-Revalidate pattern for all listing pages.
    - Switching between filters or pages is now near-instant for previously loaded data.
- **Optimized Server Actions**:
    - Updated `getSLAReportData` to handle paginated list fetching while maintaining accurate overall summary statistics.

### [2026-05-07 16:15] - Incident-Checklist Synchronization & Audit Log Standard v2
- **Major Fix: Cross-Module Sync**: Implemented a centralized `onDocumentFinalApproval` engine in `workflow.js`.
    - Automatically updates linked Checklist items to **OK** when an Incident is closed (Status: Closed).
    - Works for both manual approval steps and Auto-Approve scenarios.
    - Verified with a manual repair script for `DTT-CHK-2605-008`.
- **Audit Trail Standardization**: 
    - Implemented a new logging delimiter standard using ` | ` (Action | Details) to support multi-column display in the System Logs page.
    - Standardized `recordLog` to split action strings and improved `getSystemLogs` to correctly map action and details.
- **Security & Identity Hardening**: 
    - **BCrypt Fix**: Resolved a critical bug where reporter signatures failed due to raw-vs-hashed PIN comparison mismatches.
    - **Identity Stamping**: Mandated the use of `(Verified by PIN)` in logs for all remote/PIN-based signatures to ensure non-repudiation.
- **Documentation Update**: Synchronized `WORKFLOW_ENGINE.md`, `DEVELOPMENT.md`, and `DATABASE_AND_FLOW.md` with the new logging and sync standards.
- **UI/UX Refinement**: Optimized the System Logs & Audit page to show clearer activity history for Incidents and Checklists.

### [2026-05-07 14:35] - Workflow Standard Synchronization & Strict Identity Stamping
- **Documentation Sync**: Updated `docs/standards/WORKFLOW_ENGINE.md` to include detailed standards for **Direct vs Remote Approval** and **PIN Verification Policy**.
- **Refinement: Identity Stamping**: Enforced a strict non-repudiation policy where the system stamps the identity of the actual person signing (based on PIN verification), ensuring audit trails are accurate even in remote approval scenarios.
- **Security Optimization**: Implemented an automated PIN status check that prevents remote approval if the designated approver hasn't set up their PIN, providing a clear instructional alert to the user.
- **Code Stability**: Fixed build errors related to duplicate variable definitions and simplified the UI logic to strictly follow workflow-assigned identities.


### [2026-05-07 14:15] - Approval Visibility Refinement & Strict RBAC Enforcement
- **Critical Fix: Approval Visibility Logic**: Refactored the workflow system to enforce personal task visibility.
    - Removed the "Administrator Override" in `getUnifiedPendingApprovals` and the dashboard count logic. Administrators now only see tasks specifically assigned to them or their role.
    - Implemented a stricter query filter: `(approver_id IS NULL AND role_required = role) OR (approver_id = user_id)`.
- **Workflow Engine Upgrade**: Updated the step generation logic to automatically assign the `primary_approver_id` (from configuration) to the first workflow step, ensuring tasks are correctly routed to individuals from the start.
- **Incident Module Enhancement**: Added missing "Approve" and "Reject" buttons to the Incident detail page, synchronized with the new strict authorization logic.
- **Data Integrity**: Migrated legacy pending approval steps to include the correct `approver_id`, clearing clutter from non-responsible administrator dashboards.
- **Admin Management Guidance**: Redirected system-wide approval management (overrides/resets) to the specialized **Settings > Logs > Approval Logs** screen as per the new management standard.


### [2026-05-07 13:30] - Dashboard Action Stabilization & Premium UI Sync
- **Dashboard Data Optimization**: Finalized the `getDashboardData` server action by removing the legacy "Administrator Override" logic.
    - Approval counts now strictly mirror the individual user's assigned tasks (or role-based tasks), ensuring consistency between the dashboard notification badges and the Approvals page.
    - Synchronized "My Sent Pending" and "Waiting for Approval" tracking for all user tiers.
- **Premium UI Overhaul for Incidents**: Synchronized the Incident Management list with the "Premium Design" standard:
    - Implemented **gradient-filled stat cards** with semantic icons (🔥, ✅, ✍️, 📊) and glassmorphism depth.
    - Upgraded status and severity badges to a **unified design system** with semantic icons and soft borders.
    - Enforced a minimum table width of **1000px** with global horizontal scrolling to prevent layout breakage on smaller screens.
- **[BACKFILL] IT Checklist UI Fix**: Applied `whiteSpace: 'nowrap'` to the NG status and Creator columns in the IT Checklist list view to prevent layout shifting on narrow viewports.

### [2026-05-07 12:00] - Premium UI Redesign for Backup Log

- **Visual Excellence Upgrade**: Completely overhauled the Backup Log interface with rich aesthetics:
    - Replaced flat stat cards with **gradient-filled premium cards** featuring dynamic icons and subtle glassmorphism-style borders.
    - Fixed a logic error where status badge backgrounds were not displaying due to incorrect property naming (`bg` -> `backgroundColor`).
    - Enhanced status badges with **semantic icons** (✅/❌) and soft borders for better visual scanning.
    - Improved typography and spacing across the list view to align with the "Premium Design" standard.
- **Micro-interactions**: Added subtle depth through shadows and refined color palettes to make the dashboard feel more alive and professional.



  
### [2026-05-07 11:00] - Ultimate Onboarding Stabilization & UX Polish
- **Advanced Gatekeeper Architecture**: Finalized the separation of concerns between Proxy (Dashboard Guard) and Login Page (Session Dispatcher). Re-implemented client-side redirects using `window.location.href` to ensure cookie persistence.
- **Redirect Loop Post-Mortem**: Documented the "Redirect Loop Trap" in `USER_MANAGEMENT.md` to prevent future regressions.
- **Onboarding UI Enhancements**:
    - Added **Show/Hide Password** toggles to New Password and Confirm Password fields.
    - Added **Show/Hide PIN** toggle to the 6-digit Signature PIN field.
    - Improved PIN setup UX by allowing users to verify their digits before submission.
- **API Optimization**: Fixed `token_failed` error by removing the non-existent `onboarding_token_expires` column from the update query, ensuring 100% token generation success.
- **Standardization**: Updated all architectural diagrams and security policies to reflect the final stable state.

### [2026-05-07 10:30] - Gatekeeper Rearchitecture & Redirect Loop Resolution

### [2026-05-07 08:30] - Standardized Onboarding & Recovery Flows
- **Standardized Onboarding**: Formalized two entry paths (Invitation vs. Recovery) to ensure 100% security setup coverage for new users.
- **Auto-Tour Trigger**: Implemented automatic redirection to the `/onboarding` page based on the `is_onboarded` profile status.
- **Smart Onboarding**: Added logic to skip redundant password reset steps if the user has already performed a reset via the recovery flow.
- **Documentation Update**: Updated `docs/standards/USER_MANAGEMENT.md` with the new onboarding lifecycle standards.

### [2026-05-07 06:50] - Enhanced Identity Sync & OTP Fallback
- **Robust OTP Request**: Updated `requestSignatureOTP` to support searching by `full_name` as a fallback when `memberId` is missing, ensuring older records can still use OTP signatures.
- **Improved Modal UX**: Redesigned `MemberSignatureModal` to handle missing ID cases more gracefully with helpful instructions instead of technical debug info.
- **Legacy Record Recovery**: System now automatically attempts to link signature requests to existing user profiles using name/email matching.

### [2026-05-07 06:40] - Unified OTP Forgot Password Flow
- **OTP Recovery Implementation**: Upgraded the "Forgot Password" system to use a secure 6-digit OTP sent via email. 
- **2-Step Verification UI**: Redesigned the recovery modal on the login page to handle email entry followed by OTP verification.
- **Resend Logic**: Implemented a 60-second countdown for resending OTPs to prevent email spam.
- **Token-Based Reset**: OTP verification now generates a secure, short-lived (10-minute) token to authorize password changes on the dedicated reset page.
- **New Reset Password Page**: Created `/reset-password` to allow users to securely set their new credentials after OTP verification.
- **Database Schema Expansion**: Added `recovery_otp` and `recovery_otp_expires` to `user_profiles` to manage the recovery lifecycle.

### [2026-05-07 06:25] - Incident Save Draft Fix & OTP Identity Sync
- **Save Draft Functionality**: Fixed a critical database update error by explicitly selecting returning columns, bypassing schema cache issues related to the dropped `approval_comment` field.
- **Save Draft UX**: Added loading state feedback ("⏳ บันทึก...") and success notifications to all draft buttons in the Resolve Dialog.
- **OTP "User Not Found" Resolution**: Synchronized the requester ID layer to consistently use `reported_by_id` (UUID). Added a server-side fallback to find users by email if the UUID is missing, ensuring OTPs work for legacy or quick-added records.
- **Build Stabilization**: Resolved a JSX parsing error caused by an unescaped `>` character in `MemberSignatureModal.js`, ensuring successful deployment to Vercel.
- **Requester Data Persistence**: Fixed a bug where `reported_by_id` was being excluded from incident updates, causing identity linkage to fail during signature workflows.

### [2026-04-30] - Vercel Production Stability & Action Restructuring
- **Login Reliability Fix (Vercel):** แก้ไขปัญหา Login ไม่ได้บน Vercel Production โดยการเปลี่ยนจากการใช้ Server Action มาเป็น **API-based Auth (`/api/auth/check-tier`)** เพื่อความเสถียรสูงสุด
- **Action Restructuring:** แยกไฟล์ Server Action ออกเป็นส่วนๆ เพื่อลดปัญหา Dependency Conflict บน Serverless Environment:
  - `status.js`: ตรวจสอบประเภทผู้ใช้ (Native Fetch)
  - `login.js`: จัดการการเข้าสู่ระบบ (Isolated Bcrypt)
  - `user.js`: จัดการ Session และข้อมูล Profile
- **Infrastructure Security:** เพิ่มหน้า **System Diagnostic (`/debug-env`)** สำหรับตรวจสอบสถานะ Environment Variables บน Vercel โดยไม่เปิดเผยค่าความลับ
- **Auth Hardening:** เพิ่มระบบดักจับ Error และตรวจสอบตัวแปรสภาพแวดล้อมก่อนเริ่มทำงาน เพื่อป้องกันปัญหา Error 500
- **Test User Sync:** กู้คืนและซิงค์บัญชี `Antigravity` (exam@123.com) ให้สามารถใช้งานบนระบบจริงได้สำหรับการทดสอบ
- **Backup Functionality Fix:** แก้ไข Bug ฟังก์ชัน Backup Log ที่บันทึก/ลบข้อมูลไม่ได้ และแก้ไขปัญหา Timezone ที่ซ่อนข้อมูลวันสุดท้ายของเดือน
- **UI Auto-Refresh:** เพิ่มระบบ Auto-refresh (ทุก 5 นาที) ในหน้า Dashboard และ Backup Log เพื่อให้ข้อมูลอัปเดตตลอดเวลาโดยไม่ต้องรีเฟรชหน้าจอเอง
- **Numeric Date Formatting:** เพิ่มฟังก์ชัน `formatDateNumeric` เพื่อแสดงผลวันที่ในรูปแบบ `dd/mm/yyyy` และนำไปใช้ในหน้า SLA Compliance Dashboard ทั้งส่วนฟิลเตอร์และตารางรายการ

### [2026-05-01] - Security Hardening, Standardization & Audit Readiness
- **Core Development Standards:** จัดทำไฟล์ `DEVELOPMENT_STANDARDS.md` เพื่อเป็น "หัวใจหลัก" ในการควบคุมมาตรฐานความปลอดภัย, การเก็บ Log และคุณภาพโค้ดระดับ Enterprise
- **Double-Lock Identity Whitelist:** นำระบบ **"ทะเบียนขาวลับ" (`user_whitelist`)** มาใช้เพื่อเป็นด่านตรวจที่สอง ป้องกันปัญหาการสร้างโปรไฟล์อัตโนมัติจาก Database Triggers
- **Identity Hashing (SHA-256):** เข้ารหัสอีเมลในทะเบียนขาวเป็น SHA-256 Hash เพื่อความปลอดภัยสูงสุด (Privacy-by-Design)
- **Proactive Auto-Purge:** พัฒนาระบบกวาดล้างผู้บุกรุกในหน้า **Auth Callback** ที่จะสั่งลบ User ออกจาก Supabase Auth ทันทีหากไม่มีตราประทับใน Whitelist
- **SSO Login Logging (Audit Trail):** เพิ่มระบบจดบันทึกประวัติการเข้าใช้งานสำหรับผู้ที่ Login ผ่าน Microsoft SSO เพื่อให้มี Audit Trail ที่สมบูรณ์ในหน้า Profile และ User Management
- **Database Role Normalization:** จัดระเบียบข้อมูลสิทธิ์ (Role) ใน Database ทั้งระบบให้เป็นมาตรฐานเดียวกัน (`administrator`, `supervisor`, `approval`, `guest`) พร้อมอัปเกรด DB Check Constraint
- **Profile Data Repair:** ซ่อมแซมข้อมูลอีเมลที่หายไปในตาราง `user_profiles` ของผู้ใช้เดิมเพื่อให้หน้าจัดการผู้ใช้แสดงผลสมบูรณ์ 100%
- **Solid Iconography Standard:** เปลี่ยนไอคอนแสดงรหัสผ่านทั้งหมดเป็นแบบ **Solid SVG Icons** ที่เป็นทางการระดับ Enterprise ทั้งในหน้า Login, สร้าง User และหน้า Profile
- **Bot Protection Reinforcement:** เสริมเกราะป้องกันบอทในหน้า Login ด้วยระบบ **Honeypot** และ **Cloudflare-style human verification** เพื่อป้องกันการโจมตีแบบ Brute-force
- **Password UX Overhaul:** มาตรฐานการซ่อน/แสดงรหัสผ่านแบบ Unified ที่มี visual feedback และ security checklists ครบถ้วนในทุกจุดป้อนข้อมูล
- **Dual-Record Creation Standard:** บังคับใช้มาตรฐานการสร้าง User แบบ 3 ส่วน (Auth -> Whitelist -> Profile) เพื่อความถูกต้องของข้อมูลและระบบ Double-Lock Security
- **Enhanced Admin Feedback:** ปรับปรุงระบบรายงาน Error ในการสร้าง User ให้ระบุจุดที่ล้มเหลวอย่างชัดเจน (Auth Error, Whitelist Error, Profile Error)

### [2026-05-03] - UI Refinement & Next-Gen Checklist Planning
- **DatePicker UX Improvement:** แก้ไขปัญหาการคลิก Datepicker ยากสำเร็จ 100% ในหน้า Master Data, SLA Report, Backup Log, No. Series และ Checklist โดยใช้ `showPicker()` API
- **Standardized Date Display:** ปรับรูปแบบการแสดงผลวันที่ทั่วทั้งระบบให้เป็น `dd-MMM-yyyy` (เช่น 30-Apr-2026) เพื่อความเป็นระเบียบและอ่านง่าย
- **Dynamic Checklist Architecture (Planned):** ออกแบบสถาปัตยกรรมใหม่สำหรับระบบ Checklist ให้รองรับการเลือกแผนซ้อม IT (Drill Plans) และการตรวจตู้ CCTV แบบระบุรายการตู้ โดยใช้โครงสร้างข้อมูล JSONB
- **OneDrive Integration Strategy (Planned):** วางแผนการเชื่อมต่อ Microsoft Graph API เพื่อเก็บรูปภาพหลักฐานไว้ใน OneDrive Shared Folder เพื่อประหยัดพื้นที่ Supabase
- **Image Compression System (Planned):** เตรียมระบบบีบอัดรูปภาพฝั่ง Client ให้มีขนาดไฟล์ไม่เกิน 150kb ก่อนอัปโหลด เพื่อประสิทธิภาพสูงสุดในการใช้งาน

### [2026-05-04] - UI Optimizations, Account Management Hardening & Workflow Planning
- **Persistent Sidebar Settings:** แก้ไข Logic การแสดงผลเมนูตั้งค่าใน Sidebar ให้ค้างอยู่ (Persistent) เมื่อมีการเปลี่ยนวันที่ปฏิบัติงานหรือกด Refresh เพื่อความต่อเนื่องในการใช้งาน
- **Dashboard Dynamic Card Styling:** ปรับปรุงการ์ด Checklist บน Dashboard (Weekly, Monthly, Yearly) ให้มีการแสดงผลสีเขียวและขอบเน้นเมื่อสถานะเป็น `done` เพื่อให้สอดคล้องกับมาตรฐานของ Daily Checklist
- **Account Management (Assignee Restore):** 
  *   กู้คืนฟิลด์ **Assignee (can_be_assignee)** กลับมาในหน้าสร้างและแก้ไข User
  *   เพิ่มระบบ **Quick Action Toggle** ในตารางจัดการผู้ใช้ เพื่อให้ Admin สามารถสลับสถานะผู้รับมอบหมายงานได้โดยตรงจากหน้าลิสต์ (Optimistic UI Update)
  *   เพิ่มตัวบ่งชี้ไอคอน 👤 ในตารางหลักสำหรับผู้ที่มีสิทธิ์เป็น Assignee
- **Compact Settings Sidebar:** ปรับลดขนาดตัวอักษร (14px -> 13px) และระยะห่างแนวตั้ง (12px -> 10px) ของเมนูในหน้า Master Data/Settings เพื่อให้ดู Sleek และกะทัดรัดขึ้น
- **Approval Workflow Blueprint:** จัดทำ **Implementation Plan** สำหรับระบบอนุมัติงาน (Approval Workflow) และระบบผู้ช่วยอนุมัติแทน (Substitute Approver) เพื่อเตรียมความพร้อมสำหรับฟีเจอร์ Enterprise ในขั้นตอนถัดไป

### [2026-05-05] - Secure Approval Workflow & Signature PIN Implementation
- **Secure Approval Logic Engine**: พัฒนา `lib/workflow.js` สำหรับจัดการสถานะงาน (Draft, Pending, Approved, Rejected) และการคำนวณสิทธิ์ผู้อนุมัติแบบกลุ่ม (Approval Pool)
- **Signature PIN Security**:
  *   สร้างระบบรหัส PIN 6 หลัก พร้อมการเข้ารหัส Bcrypt และ API ตรวจสอบความปลอดภัยฝั่ง Server
  *   เพิ่มระบบ **Rate Limiting & Lockout**: ล็อคการใช้งาน 15 นาทีหากกรอกรหัสผิดครบ 5 ครั้ง เพื่อป้องกัน Brute Force
  *   เพิ่มส่วนตั้งค่า PIN ในหน้า Profile ของผู้ใช้
- **In-person Signature UI**: ติดตั้ง `SignatureModal` พร้อมระบบ Canvas สำหรับการเซ็นชื่อดิจิทัลหน้างาน
- **Approval Flow Management**: เพิ่มหน้าการตั้งค่า Approval Flows และ My Absence/Substitutes ในส่วนของ Master Data Settings
- **Checklist Workflow Integration**: เชื่อมต่อปุ่มส่งขออนุมัติและระบบตรวจสอบ PIN เข้ากับหน้ารายละเอียดใบงาน (Checklist Detail)

### [2026-05-05] - Unified Resend Integration & Legacy Cleanup
- **Unified Email Service**: พัฒนา `lib/resend.js` เพื่อเป็น Utility กลางสำหรับการส่งอีเมลผ่าน Resend.com พร้อมระบบจัดการ Error และ Logging
- **Verified Domain Transition**: ปรับปรุงจุดส่งอีเมลทั้งหมด (Welcome Email, PIN Recovery, Approval Links) ให้ใช้ผู้ส่งเป็น `noreply@dowa-tht.co.th` แทนค่าเริ่มต้นของ Resend
- **Legacy Table Migration**: ปรับปรุงระบบ Recovery ให้ดึงข้อมูลจาก `user_profiles` แทนตารางเก่าที่ยกเลิกไป (`user_registry`, `external_users`) เพื่อรองรับโครงสร้าง RBAC ใหม่
- **Security Hardening**: ปรับปรุงการนำเข้าโมดูลแบบ Dynamic ใน Server Actions เพื่อความเสถียรบนสภาพแวดล้อมที่จำกัด

### [2026-05-05] - High-Priority Incident Approval & Flexible Workflow Hardening
- **High-Priority Incident Workflow**: Integrated the Workflow engine into `incidents/[id]/page.js`. High Priority cases now require a Manager's approval via **6-digit PIN** before resolution.
- **Workflow Engine Enhancements**: 
  - Updated `lib/workflow.js` to support **Auto-Approval** (null approver) for daily checklists, resolving database UUID errors.
  - Implemented **Substitute Detection** (`isSubstituteOf`) in Incident details to allow delegates to approve cases during absence.
- **UI/UX Refinement**: 
  - Fixed mangled SLA/Exclusion UI in the Incident detail page caused by incorrect code insertion.
  - Added "Pending Approval" banners and dynamic action buttons (Approve/Reject) based on user roles and workflow state.
- **PIN Recovery Migration**: Successfully migrated PIN recovery logic from deprecated `external_users` table to unified `user_profiles` table.
- **Security Hardening (Recovery)**: Integrated **Double-Lock Whitelist** check and **is_active** status validation into the PIN recovery flow to prevent unauthorized access.
- **Unified Resend Usage**: Centralized all email communications in recovery and admin actions using the verified `noreply@dowa-tht.co.th` domain.
- **OneDrive Evidence Pipeline & Mobile UI Polish**:
  - Implemented full-cycle **OneDrive Storage** for Checklist photos, offloading heavy binary data from Supabase to Microsoft Graph.
  - Developed a **Server-Side Proxy** for OneDrive images, allowing secure previews via ID-based URLs without exposing raw OneDrive links.
  - Added **Full-Screen Photo Preview** modal to the IT Checklist, enhancing UX for field verification.
  - Optimized image processing: reduced resolution (1000px) and increased compression (Q:0.5) to achieve ~80KB file sizes.
  - Enhanced evidence integrity: added **Point-Specific Watermarks** (Top-Right) and System/Timestamp stamps (Bottom) to all uploaded photos.
  - Resolved **Dashboard UI Overflow**: Fixed layout issues on mobile devices by implementing responsive grid wrapping for Checklist cards.

### [2026-05-05] - Master Data UI Fixes
- Resolved an issue where the success notification banner persisted after navigating between different master data tabs.
- Implemented auto-clearing of messages on tab change and added a 3-second timeout for Guide save confirmations.
- Integrated a global search bar for all master data tables with real-time filtering logic.
- Redesigned the Holiday date input to support custom "dd / mmm / yyyy" formatting and placeholder.
- Added smart date parsing for holiday creation to handle both numeric and alphabetic month inputs.
- Added a **Frequency Filter** (Daily/Weekly/Monthly/Yearly) to the Checklist Master tab.
- Improved the filtering engine to support combined search terms and frequency criteria for better data management.
- Restored native browser Datepicker for better user experience while maintaining custom date display in the table.
- Added a **Month Filter** to the Holidays tab to allow users to view holidays by specific months.
- Synchronized search and month filters for comprehensive data lookup.
- Implemented a hybrid date input that displays "dd / mmm / yyyy" while retaining native calendar picker functionality.
- Corrected month filtering logic to use precise string parsing, resolving inconsistencies with timezone-based date objects.
- Upgraded month filter labels to full month names (e.g., January) for improved readability.
- Added inline editing support for holidays, allowing users to modify both date and description directly in the table.
- Synchronized the edit UI with the custom "dd / mmm / yyyy" format for a consistent user experience.
- **OneDrive Image Storage Integration**: Developed a full-stack image processing and storage pipeline using **Microsoft Graph API**. Implemented **Client-Side Compression** (<150kb) and **Dynamic Watermarking** (Timestamp & Brand). Created a centralized **OneDrive Utility** for background file uploads to specialized application folders (`/Apps/Dowa-IT-System`). Added a reusable `ChecklistImageUpload` component.
- **System Stabilization & UI Responsiveness**: Replaced deprecated `@supabase/auth-helpers-nextjs` with `@supabase/supabase-js`. Normalized all business minutes calculations to Bangkok Time (UTC+7). Implemented a responsive Sidebar with a Hamburger Menu and optimized the SLA Report table for small screens. Synchronized `user_whitelist` with all existing `user_profiles`.
- **Workflow Stability & UI Polish**: Implemented smart button text (🚀 ส่งบันทึกและปิดงาน) for Auto-Approve scenarios. Fixed a bug where approved documents remained "In Progress". Updated the Reopen/Unlock function. Upgraded the `PhotoTemplate`. Synchronized status badge logic between the Checklist List and Detail pages.
- **Documentation & Help System Overhaul**: Rewrote all system guides (11+ sections) in Thai. Added 📖 guide buttons and modal logic. Updated documentation for RBAC, Signature PIN, OneDrive Integration, Auto-Approve logic, and SLA/KPI calculations. Implemented robust code-level fallback content for all guides.

### [2026-05-06 11:30] - Phase 2 - User-Linked Incidents & PIN-Verified Signatures
- **Requester Identity Linking**: Replaced static text fields with `UserAutocomplete` linked to `user_profiles`.
- **Quick Add User**: Implemented a "Quick Add" modal for creating new members directly from the incident flow.
- **PIN-Verified Signatures**: Enforced mandatory 6-digit PIN verification for members before digital signature collection (with 5-attempt brute-force lock).
- **Member Role Access Control (RBAC)**: Hidden IT-only widgets for members. Members can only view and manage incidents where they are the reporter (`reported_by_id`).
- **Incident SLA Logic**: Refined "Acknowledge" button visibility and automated SLA reset when an assignee is removed.

### [2026-05-06 13:54] - Document Status Standardization & AI Mandatory Workflow
- **Standardized Document Workflow**: Implemented a unified 4-stage status model across both Checklist and Incident modules: `Open` -> `In Progress` -> `Pending Approval` -> `Closed`.
- **Incident Status Standard**: Replaced legacy `Resolved` status with `Closed`. Added automatic transition to `Pending Approval` when an IT technician finishes work but awaits final signatures.
- **Checklist Status Hardening**: Forced `In Progress` status in the database upon the first check action (OK/NG) to ensure dashboard accuracy. Standardized `Pending Approval` state for all frequency types (Daily to Yearly).
- **UI/Badge Synchronization**: Updated all status badge colors and filter dropdowns to match the new standard (Amber/Orange for Pending Approval, Green for Closed).
- **New AI Agent Rules**: Formalized the **[PRIORITIZE STANDARDS]** rule in `AGENTS.md`. Mandated **[CRITICAL LOGIC CONFIRMATION]** with `> [!IMPORTANT]` alerts. Added **[DOCUMENTATION SYNC]** rule.
- **Unified Workflow Engine Planning**: Designed and documented the centralized workflow architecture in `WORKFLOW_ENGINE_STANDARD.md`. Planned for future data migration. Standardized sequential approval logic.

### [2026-05-06 14:45] - Unified Workflow Engine & Data Standardization
- **Unified Workflow Engine**: Fully transitioned all Checklist and Incident documents to a centralized, configuration-based engine.
- **Admin Workflow Settings**: Developed `app/dashboard/settings/workflow/page.js` to allow admins to manage approval steps dynamically.
- **Zero-Hack Policy Enforcement**: Performed a full-system migration to replace legacy `Resolved` status with `Closed`. Removed all UI-level status mapping "hacks". Updated `SYSTEM_ARCHITECTURE.md` and `AGENTS.md` with the mandatory **Zero-Hack Policy**.
- **Dashboard Optimization**: Updated pending approval counts to query the unified `document_approvals` table.

### [2026-05-06 15:10] - Documentation Restructuring & Final DB Migration
- **Modular Documentation Framework**: 
  - Restructured monolithic markdown files into a clean `docs/` hierarchy (`architecture/`, `standards/`, `history/`).
  - Created `docs/INDEX.md` as the primary routing file for AI and developers to prevent Context Overflow.
  - Updated `AGENTS.md` rule `[DOCUMENTATION STRUCTURE]` enforcing all new documentation to reside within the `docs/` folder.
- **Final Database Consistency Check**:
  - Successfully dropped legacy `incidents_status_check` and `checklist_documents_status_check`.
  - Executed a global update, shifting all legacy `Resolved` statuses to the `Closed` standard across primary tables and audit logs.
  - Applied new schema constraints to securely enforce only `Open`, `In Progress`, `Pending Approval`, and `Closed` states moving forward.

### [2026-05-06 15:45] - Critical UI Bug Fixes & Component Stabilization
- **Incident Detail UI Restoration**: Fixed critical JSX syntax errors in `app/dashboard/incidents/[id]/page.js` including unbalanced `<div>` tags and an extra closing brace that caused the page to crash.
- **Component Dependency Resolution**: Resolved "not defined" errors by importing missing shared components and utilities (`SignatureModal`, `MemberSignatureModal`, `UserAutocomplete`, `Link`, `isSubstituteOf`).
- **SLA Calculation Refinement**: Consolidated and moved SLA calculation constants (`responseLimit`, `slaLimit`) to prevent variable shadowing and ensure accurate SLA tracking during the resolution flow.
- **SLA Report Restoration**: Fixed a ReferenceError in `getSLAReportData` server action where an incorrect variable name (`resolved` vs `closed`) caused the entire dashboard to fail when no incidents were found or during summary calculation.
- **SLA Calculation Standardization**: Centralized SLA rate calculation logic into `lib/slaUtils.js`. Both Dashboard and SLA Reports now use the same rounding logic and business hour rules, ensuring data consistency across the platform.
- **YTD KPI Implementation**: Added Year-To-Date (YTD) SLA calculation to the main dashboard, allowing users to track performance from the start of the current year (2569 BE).
- **UI Standardization**: Updated the SLA Report dashboard to include severity and status badges, matching the visual language of the Incident and Checklist modules. Added explicit date range labels to all SLA-related cards for better transparency.
- **Code Cleanliness**: Eliminated ESLint errors related to unescaped entities and improper state updates in effects, ensuring the codebase remains clean and maintainable.

### [2026-05-06 17:00] - Secure Onboarding & Identity Management Upgrade
- **Major Security Upgrade: Identity & Onboarding System v2.0**
  - **Dual-Path User Creation**: Added support for both "Email Invitation" (Self-Register) and "Manual Setup" (Admin-assigned password).
  - **Mandatory Onboarding Tour**: Created a multi-step onboarding wizard (`/onboarding`) that forces new users to set a complex password and personal Signature PIN before accessing the system.
  - **OTP-Verified Signatures**: Implemented a secure OTP-via-Email verification flow for unverified users, allowing them to sign documents safely without a permanent PIN.
  - **Secure Clean Delete**: Upgraded account deletion logic with a mandatory `DELETE-[EMAIL]` confirmation string to prevent accidental data loss.
  - **Guest Lifecycle Management**: Implemented a 3-day Time-To-Live (TTL) for guest accounts with automated expiry logic.
  - **New Security Standards**: Established `docs/standards/USER_MANAGEMENT.md` as the definitive guide for onboarding and identity security.
### [2026-05-06 22:50] - Incident Signature Workflow & Schema Stabilization
- **Critical Fix: Database Schema Sync**: Eliminated `Could not find the "approval_comment" column` errors by removing legacy field references in `app/actions/workflow.js` and implementing strict data cleaning in `app/dashboard/incidents/[id]/page.js`.
- **Restored "Save Draft" Functionality**: Re-engineered the `handleResolve` logic to support partial signature saving without triggering the full approval workflow.
- **Requester Identity Hardening**:
  - Upgraded the "New Incident" form to use `UserAutocomplete`, ensuring all new records are linked to a valid `user_profiles.id` from creation.
  - Improved diagnostic feedback in the signature modal with a **DEBUG INFO** panel to aid in identity troubleshooting.
- **Workflow Reliability**: Standardized the `created_by` (UUID) field as the primary identity key for incident reporters, ensuring compatibility with the new PIN/OTP verification system.
