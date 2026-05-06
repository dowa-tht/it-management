# Change Logs (บันทึกการเปลี่ยนแปลง)

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
