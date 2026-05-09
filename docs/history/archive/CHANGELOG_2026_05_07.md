# Changelog Archive - 2026-05-07

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

### [2026-05-07 22:00] - Approval System Overhaul & Unified Audit Log
- **[NEW] `getApprovalAuditLog()` Server Action** (`workflow.js`): ดึงข้อมูลทุก Row ใน `document_approvals` (approved / pending / waiting) พร้อม JOIN ชื่อเอกสารจาก `incidents` และ `checklist_docs` และ JOIN ชื่อผู้อนุมัติจาก `user_profiles`
- **[REDESIGN] หน้า `/dashboard/approvals`**: ปรับเป็น 2-Tab Layout:
  - **Tab "รออนุมัติ"**: Queue เดิม (ไม่เปลี่ยนแปลง Logic)
  - **Tab "ประวัติการอนุมัติ"**: แสดง 1 บรรทัดต่อ 1 Sequence — เห็นทุก Step ของทุกเอกสารพร้อมกัน
- **Filter**: กรองด้วย Status Pill (อนุมัติแล้ว / รออนุมัติ / รอลำดับก่อน), ประเภทเอกสาร, และ Keyword Search
- **Summary Pills**: แสดงจำนวนแต่ละสถานะ สามารถกด Filter ได้ทันที

### [2026-05-07 21:50] - Incident Workflow & Approval Integration
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

---
*ย้ายข้อมูลเมื่อ 08-May-2026 เพื่อลดขนาดไฟล์หลัก*
