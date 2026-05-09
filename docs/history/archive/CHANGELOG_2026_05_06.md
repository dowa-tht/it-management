# Changelog Archive - 2026-05-06

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

---
*ย้ายข้อมูลเมื่อ 08-May-2026*
