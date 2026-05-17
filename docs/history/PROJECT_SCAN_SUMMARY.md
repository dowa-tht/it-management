# 🔍 DOWA IT System - Project Scan Summary

**Date:** May 2026 (Based on latest codebase analysis)
**System:** DOWA IT System (Next.js 15 + Supabase Enterprise Application)

---

## 1. Project Overview

**Tech Stack ที่พบในระบบ:**
*   **Core Framework:** Next.js 15 (App Router) + React 19
*   **Styling:** Tailwind CSS v4 (ใช้ `clsx` และ `tailwind-merge` ผ่าน `lib/cn.js`)
*   **Database & Auth:** Supabase (PostgreSQL, Supabase Auth, SSR Client)
*   **Security:** Bcrypt (สำหรับ Hash PIN 6 หลัก), Zod (สำหรับ Data Validation)
*   **Integrations:** Resend (ส่งอีเมล), Microsoft Graph API (อัปโหลดรูปภาพหลักฐานเข้า OneDrive)
*   **UI Libraries:** Recharts (กราฟ Dashboard), `react-signature-canvas` (ลายเซ็นดิจิทัล)

**โครงสร้าง Folder หลัก:**
*   `app/actions/`: ศูนย์รวม Business Logic ทั้งหมด (Server Actions) ทำงานฝั่ง Server เพื่อความปลอดภัย (Zero-Trust)
*   `app/api/`: Route Handlers สำหรับ API ภายนอก เช่น Webhook, QR Lookup, และ Auth Callbacks
*   `app/dashboard/`: หน้าจอ UI หลักของระบบที่ต้องผ่านการ Login แบ่งตาม Module (Incidents, Checklist, Reports, Settings)
*   `components/`: Shared UI Components เช่น `WorkflowActionBar`, `UnifiedApprovalModal`
*   `lib/`: Core Utilities เช่น `slaUtils.js` (คำนวณเวลา), `workflowRegistry.js` (ตั้งค่าตาราง), `supabaseAdmin.js` (Service Role Client)
*   `docs/`: เอกสารมาตรฐานการพัฒนา (Standards), ประวัติการทำงาน (History), และคู่มือ (Manuals)
*   `supabase/migrations/`: ไฟล์ SQL สำหรับสร้างตาราง, RLS Policies, และ RPC Functions (เช่น `handle_approval_step`)

---

## 2. Function Inventory

ตารางสรุป Server Actions และ Core Functions หลักที่ขับเคลื่อนระบบ:

| Function | File | Input | Output | หน้าที่ |
| :--- | :--- | :--- | :--- | :--- |
| `createIncident` | `app/actions/incidents.js:20` | `formData` | `{ success, docId, caseNo }` | รันเลขที่เอกสาร, สร้าง Incident, บันทึก Log |
| `acknowledgeIncident` | `app/actions/incidents.js:108` | `id, severity, assigneeId` | `{ success, error }` | IT รับเรื่อง หรือ Admin มอบหมายงาน (Dispatch) |
| `submitRequest` | `app/actions/workflow.js:806` | `docId, targetType, triggerKey, userEmail, ...` | `{ success, autoApproved }` | ส่งเอกสารขออนุมัติ, สร้าง Workflow Steps |
| `submitApprovalStep` | `app/actions/workflow.js:1121` | `docId, docType, stepId, signatureData, pin, ...` | `{ success, isFinal }` | ตรวจสอบ PIN และเรียก RPC อนุมัติเอกสาร |
| `generateWorkflowSteps` | `app/actions/workflow.js:908` | `docId, targetType, configKey, triggerKey` | `{ success, autoApproved }` | สร้างลำดับการอนุมัติจาก `workflow_configs` |
| `onDocumentFinalApproval`| `app/actions/workflow.js:13` | `docId, docType` | `void` | Cross-module sync (เช่น ปิด Incident -> อัปเดต Checklist เป็น OK) |
| `getSLAReportData` | `app/actions/reports.js:5` | `startDate, endDate, page` | `{ success, data, summary, settings }` | ดึงข้อมูลและคำนวณ SLA (Strict Mode) |
| `calculateNetBusinessMinutes`| `lib/slaUtils.js:20` | `start, end, settings, holidays, exclusions` | `Number` (นาที) | คำนวณเวลาทำงานสุทธิ หักวันหยุดและนอกเวลา |
| `unifiedLogin` | `app/actions/login.js:11` | `email, password` | `{ success, needs_onboarding, ... }` | Login ผ่าน Supabase Auth + เช็ค Whitelist |
| `createAdminUser` | `app/actions/admin.js:34` | `email, password, full_name, role, ...` | `{ success, error }` | สร้าง User (Auth -> Whitelist -> Profile) |
| `getTargetAssetHistory` | `app/actions/target.js:55` | `targetId` | `{ success, target, docs }` | ดึงประวัติการตรวจเช็คของ Asset (QR) |
| `resolveChecklistQr` | `app/actions/target.js:256` | `qrCode` | `{ success, type, targetId, redirectUrl }` | แปลง QR Code เป็น URL ของ Asset/Point |

---

## 3. Module Workflow

### 3.1 Incident Module
1.  **แจ้งปัญหา (Open):** User กรอกฟอร์ม → เรียก `createIncident` (`app/actions/incidents.js:20`) ระบบจะ Gen เลขที่เอกสารและบันทึกสถานะ `Open`
2.  **รับงาน/มอบหมาย (In Progress):** IT กดรับงาน หรือ Admin กด Dispatch → เรียก `acknowledgeIncident` (`app/actions/incidents.js:108`) เริ่มนับ Resolution SLA
3.  **แก้ไขและส่งงาน (Pending Approval):** IT กรอกวิธีแก้ปัญหาและเซ็นชื่อ → เรียก `submitRequest` (`app/actions/workflow.js:806`) ระบบจะสร้าง Steps การอนุมัติ
4.  **อนุมัติ (Closed):** ผู้อนุมัติ (หรือผู้แจ้ง) กรอก PIN 6 หลัก → เรียก `submitApprovalStep` (`app/actions/workflow.js:1121`) ซึ่งจะไปเรียก RPC `handle_approval_step` ใน Database หากเป็นคิวสุดท้าย สถานะจะเปลี่ยนเป็น `Closed`

### 3.2 IT Checklist Module
1.  **สร้างเอกสาร:** User เลือก Template → UI เรียก `supabase.from('checklist_docs').insert(...)` (`app/dashboard/checklist/page.js:695`) และ Snapshot Template Config ลง `checklist_items`
2.  **ลงผลตรวจ:** User กด OK/NG หรืออัปโหลดรูป (รูปถูกส่งไป OneDrive ผ่าน `/api/upload/onedrive`) → UI อัปเดต `checklist_items` โดยตรง
3.  **ส่งอนุมัติ:** กดส่งงาน → เรียก `submitRequest` (`app/actions/workflow.js:806`)
4.  **อนุมัติ:** ผู้อนุมัติตรวจสอบและกรอก PIN → เรียก `submitApprovalStep` (`app/actions/workflow.js:1121`)

### 3.3 SLA Engine
*   **ไฟล์หลัก:** `lib/slaUtils.js`
*   **ฟังก์ชัน:** `calculateNetBusinessMinutes` (Line 20)
*   **วิธีคำนวณ:**
    1.  แปลงเวลาเป็น Bangkok Time (UTC+7)
    2.  Loop ทีละวันตั้งแต่ `start` ถึง `end`
    3.  ตรวจสอบว่าวันนั้นอยู่ใน `work_days` (เช่น จันทร์-ศุกร์) และไม่อยู่ใน `holidays` (วันหยุดนักขัตฤกษ์)
    4.  คำนวณเวลาที่ทับซ้อนกับ `start` และ `end` ของเวลาทำการ (เช่น 08:30 - 17:30)
    5.  นำเวลาที่ได้มาหักลบกับ `exclusions` (เวลาที่ถูก Pause เช่น รออะไหล่) แบบ Recursive

### 3.4 Approval Workflow (Unified Engine)
*   **ไฟล์หลัก:** `app/actions/workflow.js`
*   **ลำดับขั้นตอน:**
    1.  `generateWorkflowSteps` (Line 908): อ่าน Config จาก `workflow_configs` (รองรับ JSONB steps) และ Insert ลง `document_approvals`
    2.  `syncDynamicWorkflowApprovers` (Line 67): อัปเดต `approver_id` แบบ Dynamic (เช่น ดึง ID ของผู้แจ้งมาเป็นผู้อนุมัติใน Step ของ Reporter)
    3.  `submitApprovalStep` (Line 1121): ตรวจสอบ PIN ผ่าน `verifyEmployeePIN` และส่งข้อมูลไปให้ PostgreSQL RPC `handle_approval_step` ทำงานแบบ Atomic Transaction
    4.  `onDocumentFinalApproval` (Line 13): หากเอกสารจบ Flow จะทำ Cross-module sync (เช่น ปิด Incident แล้วไปอัปเดต Checklist Item เป็น OK อัตโนมัติ)

### 3.5 Setup Module
จัดการผ่านเมนู Settings (`app/dashboard/settings/`):
*   **System Setup:** `No. Series` (เลขรันเอกสาร), `Working Hours` (เวลาทำการ), `Holidays` (วันหยุด)
*   **Master Data:** `Incident Master Data` (Category, Affected System), `Checklist Master Data` (Category, Templates, Procedure Plans)
*   **Workflow & Approval:** `Workflow Rules` (ลำดับขั้น), `Approval Flows` (ผู้อนุมัติหลัก), `Substitute Approvers` (คนเซ็นแทน)
*   **Users & Access:** `Users` (จัดการบัญชี), `Permissions` (สิทธิ์ RO/RW/NONE)
*   **Target Registry:** จัดการ Asset/Target รายตัวและ QR Code

---

## 4. Data Flow Diagram

```mermaid
sequenceDiagram
    participant UI as Client Components (UI)
    participant SA as Server Actions (Next.js)
    participant RPC as Supabase RPC (PostgreSQL)
    participant DB as Supabase Tables

    %% Incident Flow
    rect rgb(240, 248, 255)
    Note over UI, DB: Incident Creation & Resolve Flow
    UI->>SA: createIncident(formData)
    SA->>DB: Insert into 'incidents'
    SA-->>UI: Return docId
    UI->>SA: submitRequest(docId, 'incident', ...)
    SA->>DB: generateWorkflowSteps() -> Insert 'document_approvals'
    SA-->>UI: Success
    end

    %% Approval Flow (Unified)
    rect rgb(255, 240, 245)
    Note over UI, DB: Unified Approval Flow (Incident & Checklist)
    UI->>SA: submitApprovalStep(docId, stepId, pin, signature)
    SA->>SA: verifyEmployeePIN(userId, pin)
    SA->>RPC: rpc('handle_approval_step')
    Note over RPC, DB: Atomic Transaction
    RPC->>DB: Update 'document_approvals' (status='approved')
    RPC->>DB: Unlock next step OR Update Main Table (status='Closed')
    RPC->>DB: Insert into 'system_audit_logs'
    RPC-->>SA: Return { success, is_final }
    SA->>SA: onDocumentFinalApproval() [If is_final]
    SA-->>UI: Return Success
    end

    5. Database Tables
ชื่อตาราง	Columns หลักที่ใช้บ่อย	ความสัมพันธ์ (Relations)
user_profiles	id, email, full_name, role, signature_pin, is_active	Source of Truth ของ User. FK ไปยัง created_by, reported_by_id, approver_id
user_whitelist	email_hash	ใช้ทำ Double-Lock Security ตอน Login
incidents	id, case_number, status, severity, reported_by_id, assigned_to_id	1:N กับ document_approvals และ system_audit_logs
checklist_docs	id, doc_no, freq_type, period_date, status, target_id	1:N กับ checklist_items และ document_approvals
checklist_items	id, doc_id, item_key, status, template_data (JSONB)	เก็บผลตรวจและรูปภาพ (OneDrive ID) ใน template_data
document_approvals	id, doc_id, doc_type, step_order, approver_id, status	เก็บสถานะ Workflow แต่ละ Step (รออนุมัติ, อนุมัติแล้ว)
system_audit_logs	id, doc_id, doc_type, action, details, user_email	Centralized Log เก็บประวัติทุก Action ในระบบ
checklist_targets	id, target_code, target_type, qr_value, metadata	ทะเบียน Asset สำหรับสแกน QR Code
workflow_configs	id, target_type, condition_key, condition_value, steps (JSONB)	เก็บ Template ลำดับการอนุมัติ
6. ความเสี่ยงและจุดที่ควรระวัง (Risks & Cautions)
Logic ที่ซับซ้อน (Heavy Computation):
calculateNetBusinessMinutes (lib/slaUtils.js:20): มีการใช้ while loop วนทีละวันเพื่อคำนวณเวลาทำงาน หาก start และ end ห่างกันเป็นปี อาจทำให้เกิด Performance Bottleneck ได้ (แม้จะมี safetyCounter < 1000 ดักไว้ก็ตาม)
getDashboardData (app/actions/dashboard.js:6): ดึงข้อมูลจากหลายตารางพร้อมกัน (Promise.all 14 queries) และมีการคำนวณ Streak/SLA ในหน่วยความจำฝั่ง Server ค่อนข้างเยอะ
Shared Dependency (คอขวดของระบบ):
app/actions/workflow.js: เป็นไฟล์ที่ใหญ่มากและรับผิดชอบ Logic ข้าม Module ทั้งหมด (Incident, Checklist, Approval, Logging, Sync) หากแก้ไขไฟล์นี้อาจกระทบระบบอื่นได้ง่าย
lib/supabaseAdmin.js: ใช้ SUPABASE_SERVICE_ROLE_KEY เพื่อ Bypass RLS ใน Server Actions หากหลุดไปฝั่ง Client จะเป็นช่องโหว่ร้ายแรง (มีการป้องกันด้วย 'use server' แล้ว แต่ต้องระวังเวลา Refactor)
จุดที่โค้ดยังไม่ครบหรือเป็น TODO:
Target Registry & QR Asset History: ใน docs/history/IMPLEMENTATION_PLAN_TARGET_REGISTRY_QR_ASSET_HISTORY.md ระบุว่าโครงสร้างเสร็จแล้ว แต่ยังรอการทำ UAT Seed Data (scripts/seed_target_registry_uat.sql) และการนำไปใช้จริงใน Production
RLS Policies: เพิ่งมีการสร้างไฟล์ supabase/migrations/add_rls_policies.sql เพื่อเปิด RLS 18 ตาราง (ตาม CHANGELOG_2026_05_13.md) แต่มี Note ว่า "ยังไม่ได้ถูก apply กับฐานข้อมูลจริง ต้อง review และทดสอบ" หาก Apply อาจทำให้บาง Query ที่ไม่ได้ใช้ Admin Client พังได้
Legacy Data Cleanup: ใน workflow.js ยังมีการเขียน Log ลงตารางเก่า (incident_logs, checklist_logs) ควบคู่ไปกับ system_audit_logs (Line 256) เพื่อ Backward Compatibility ซึ่งควรถูก Deprecate ในอนาคต