# Changelog Archive - 2026-05-05

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

---
*ย้ายข้อมูลเมื่อ 08-May-2026*
