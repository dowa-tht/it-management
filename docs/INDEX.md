# 📘 DOWA IT System - Documentation Index

**[ATTENTION AI AGENTS]**  
This is the central documentation hub. You MUST read this file first before starting any task to understand the system's architecture and find the relevant documentation for your specific task. **DO NOT read all files unless necessary to avoid context overflow.**

**Latest Update (06-Jun-2026 17:32):** Audit Trail & Logs Viewer rollout ปิด functional verification แล้ว, เอกสารสถาปัตยกรรม/คู่มือถูก sync ให้ตรงกับ structured audit logs และ logs viewer ปัจจุบัน, และมี follow-up RLS fix สำหรับ `auditor` read-only ใน `incident/checklist`

---

## 🏛️ 1. Architecture & Core Systems (`docs/architecture/`)
เอกสารหมวดนี้เกี่ยวกับโครงสร้างพื้นฐาน การออกแบบฐานข้อมูล และระบบความปลอดภัย
- [DATABASE_AND_FLOW.md](file:///c:/Users/Lenovo/dowa-it-system/docs/architecture/DATABASE_AND_FLOW.md) : โครงสร้าง Database หลัก, ความสัมพันธ์ของตาราง, และ Workflow การทำงาน (Authentication, Checklist Engine)
- [RBAC.md](file:///c:/Users/Lenovo/dowa-it-system/docs/architecture/RBAC.md) : แผนงานและโครงสร้างของระบบสิทธิ์การใช้งาน (Role-Based Access Control) สำหรับ `admin`, `it_staff`, `employee`, `auditor`, และ `approver`
- [RBAC_PLAN_THAI.txt](file:///c:/Users/Lenovo/dowa-it-system/docs/architecture/RBAC_PLAN_THAI.txt) : บันทึกการวางแผนระบบ RBAC เริ่มต้น (Archive)

---

## 📜 ประเภทที่ 1: มาตรฐานการพัฒนาระบบ (Development Standards)
*หมวดหมู่นี้ใช้สำหรับให้ Agent ยึดถือเป็นหลักการและ Logic ในการพัฒนาระบบ (Source of Truth for Agents)*
**Directory:** `docs/standards/`
- [ZERO_HACK_POLICY.md](file:///c:/Users/Lenovo/dowa-it-system/docs/standards/ZERO_HACK_POLICY.md) : นโยบายห้ามใช้ UI Hacks
- [DEVELOPMENT.md](file:///c:/Users/Lenovo/dowa-it-system/docs/standards/DEVELOPMENT.md) : มาตรฐานโค้ด, Logging, Security และ structured audit contract สำหรับ document/settings changes
- [WORKFLOW_ENGINE.md](file:///c:/Users/Lenovo/dowa-it-system/docs/standards/WORKFLOW_ENGINE.md) : มาตรฐานการอนุมัติและสถานะเอกสาร
- [USER_MANAGEMENT.md](file:///c:/Users/Lenovo/dowa-it-system/docs/standards/USER_MANAGEMENT.md) : มาตรฐานการจัดการผู้ใช้และความปลอดภัย
- [PERMISSIONS.md](file:///c:/Users/Lenovo/dowa-it-system/docs/standards/PERMISSIONS.md) : มาตรฐานระบบสิทธิ์การใช้งาน
- [UI_UX_SETTING.md](file:///c:/Users/Lenovo/dowa-it-system/docs/standards/UI_UX_SETTING.md) : มาตรฐานการออกแบบหน้าจอ Master Data
- [UI_UX_SETTINGS_DESIGN_SYSTEM.md](file:///c:/Users/Lenovo/dowa-it-system/docs/standards/UI_UX_SETTINGS_DESIGN_SYSTEM.md) : มาตรฐาน Design System ของเมนู Settings ทั้งหมด อ้างอิงหน้า Permissions และกำหนด responsive สำหรับ tablet/smartphone
- [UI_LAYOUT_SPACING_REMEDIATION.md](file:///c:/Users/Lenovo/dowa-it-system/docs/standards/UI_LAYOUT_SPACING_REMEDIATION.md) : มาตรฐานการตรวจและแก้ปัญหา layout ชิดขอบ, card/object ติดกัน, spacing หาย และ Tailwind utility ไม่เสถียร
- [INLINE_STYLE_STANDARD.md](file:///c:/Users/Lenovo/dowa-it-system/docs/standards/INLINE_STYLE_STANDARD.md) : ⚠️ **[TAILWIND-JIT-ISSUE]** มาตรฐานบังคับ — ใช้ inline style แทน Tailwind class สำหรับ `/dashboard/settings/*` ทุกหน้า เนื่องจาก Tailwind JIT scan ไม่ครอบคลุม path นี้ (พร้อม design tokens, card anatomy และ migration guide)
- [UI_UX_RESPONSIVE.md](file:///c:/Users/Lenovo/dowa-it-system/docs/standards/UI_UX_RESPONSIVE.md) : มาตรฐานหน้าจอ Multi-Device
- [ENVIRONMENT_AND_SERVER_ACTIONS.md](file:///c:/Users/Lenovo/dowa-it-system/docs/standards/ENVIRONMENT_AND_SERVER_ACTIONS.md) : มาตรฐานการจัดการ Environment Variables และ Server Actions
- [SLA_MANAGEMENT.md](file:///c:/Users/Lenovo/dowa-it-system/docs/standards/SLA_MANAGEMENT.md) : มาตรฐานการคำนวณและบริหารจัดการ SLA (KPI) — เวอร์ชันรวมศูนย์ (Response/Resolution contract, `N/A`, Closed-only scoring)
- [INCIDENT_MANAGEMENT.md](file:///c:/Users/Lenovo/dowa-it-system/docs/standards/INCIDENT_MANAGEMENT.md) : มาตรฐานการจัดการเหตุการณ์และขั้นตอนการทำงาน — ผูก SLA lifecycle กับ Pending Approval pause และกฎการประเมินล่าสุด
- [TARGET_REGISTRY.md](file:///c:/Users/Lenovo/dowa-it-system/docs/standards/TARGET_REGISTRY.md) : มาตรฐาน Target Registry, โครงสร้างตาราง asset/target, และการผูก template กับ target/group
- [QR_ASSET_HISTORY.md](file:///c:/Users/Lenovo/dowa-it-system/docs/standards/QR_ASSET_HISTORY.md) : มาตรฐาน API และ flow สำหรับ QR lookup และ Asset History
- [TARGET_REGISTRY_QR_HISTORY_REQUIREMENTS.md](file:///c:/Users/Lenovo/dowa-it-system/docs/standards/TARGET_REGISTRY_QR_HISTORY_REQUIREMENTS.md) : [NEW] ข้อกำหนดทางระบบสำหรับ Target Registry, Behavior Overrides, และหน้าปฏิทินสาธารณะสแกน QR Code 30 นาที
- [INCIDENT_LIFECYCLE_OVERHAUL_SPEC.md](file:///c:/Users/Lenovo/dowa-it-system/docs/standards/INCIDENT_LIFECYCLE_OVERHAUL_SPEC.md) : รายละเอียดทางเทคนิคสำหรับการปรับปรุงวงจรชีวิต Incident
- [DOCUMENT_MAPPING_STANDARD.md](file:///c:/Users/Lenovo/dowa-it-system/docs/standards/DOCUMENT_MAPPING_STANDARD.md) : มาตรฐานการจับคู่ข้อมูลและสถานะ Workflow ของระบบ
- [SYSTEM_ARCHITECTURE_MAP.md](file:///c:/Users/Lenovo/dowa-it-system/docs/standards/SYSTEM_ARCHITECTURE_MAP.md) : [AGGREGATION TOOL] แผนผังโครงสร้างสถาปัตยกรรมและ Logic Flow (สำหรับ Agent)
- [AGENCY_QUICK_REFERENCE.md](file:///c:/Users/Lenovo/dowa-it-system/docs/standards/AGENCY_QUICK_REFERENCE.md) : [AGGREGATION TOOL] รวมสูตรสำเร็จ (Cheat Sheet), audit log mapping, และคำสั่งที่ใช้บ่อย (สำหรับ Agent)
- [FUNCTION_REGISTRY.md](file:///c:/Users/Lenovo/dowa-it-system/docs/standards/FUNCTION_REGISTRY.md) : ดัชนีฟังก์ชันและคอมโพเนนต์หลักของระบบ ใช้สำหรับนำทางการตรวจสอบ source code และ workflow ของ AI
- [WINDSURF.md](file:///c:/Users/Lenovo/dowa-it-system/docs/standards/WINDSURF.md) : มาตรฐานวิธีคิดและกระบวนการทำงานของ AI เชิง Evidence-first สำหรับใช้ร่วมกับ Agent Rules และ Superpowers
- [AGENTS.md](file:///c:/Users/Lenovo/dowa-it-system/AGENTS.md) : กฎข้อบังคับและ Workflow สำหรับ AI และ Agent ทุกตัวในระบบ (มีผลบังคับใช้สูงสุด)
- [.julesrules](file:///c:/Users/Lenovo/dowa-it-system/.julesrules) : กฎข้อบังคับและข้อกำหนดเฉพาะสำหรับ Google Jules Coding Agent
- [SUPERPOWERS.md](file:///c:/Users/Lenovo/dowa-it-system/docs/standards/SUPERPOWERS.md) : คู่มือการผสานและใช้งาน Superpowers Skills Library (v5.1.0) สำหรับ AI Agents ทุกตัว

### 👤 Agent Roles
- [roles/README.md](file:///c:/Users/Lenovo/dowa-it-system/docs/standards/roles/README.md) : สารบัญและโครงสร้างของบทบาท Agent ย่อย


---

## 📅 ประเภทที่ 2: บันทึกการดำเนินการและประวัติ (Implementation History)
*หมวดหมู่นี้ใช้สำหรับบันทึกความคืบหน้า ประวัติการเปลี่ยนแปลง และรายงานสถานะ (Audit Trail)*
**Directory:** `docs/history/`
- [UNIFIED_WORKFLOW_STANDARD_PLAN.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/UNIFIED_WORKFLOW_STANDARD_PLAN.md): แผนการปรับปรุงมาตรฐาน Workflow ทั้งระบบ
- [WORKFLOW_REFINEMENT_PHASE_2.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/WORKFLOW_REFINEMENT_PHASE_2.md): [PLAN] แผนการปรับปรุงความเสถียร (Phase 2: Transactions & Logs)
- [UI_UX_WORKFLOW_CARD_UPGRADE.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/UI_UX_WORKFLOW_CARD_UPGRADE.md): [PLAN] แผนการอัปเกรด UI/UX เป็นแบบ Card (Phase 3)
- [CHANGELOG.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/CHANGELOG.md) : บันทึกการเปลี่ยนแปลงรายวัน
- [archive/CHANGELOG_2026_06_04.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_06_04.md) : บันทึก changelog รายวันแบบ archive สำหรับ 4-Jun-2026
- [archive/CHANGELOG_2026_05_29.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_29.md) : บันทึก changelog รายวันแบบ archive สำหรับ 29-May-2026
- [USER_TASKS.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/USER_TASKS.md) : รายการงานที่ USER ฝากแก้ไขและติดตามความคืบหน้า (Agent ต้องอ่านทุกครั้ง)
- [REF_INCIDENT_CREATION_FLOW.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/REF_INCIDENT_CREATION_FLOW.md) : [PLAN] แผนการ Refactor ระบบการสร้าง Incident
- [REF_ROLE_AUDITOR_REFACTOR.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/REF_ROLE_AUDITOR_REFACTOR.md) : [PLAN] แผนการเปลี่ยนชื่อ Role จาก Guest เป็น Auditor
- [REF_USER_MANAGEMENT_HARDENING.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/REF_USER_MANAGEMENT_HARDENING.md) : [PLAN] แผนการเสริมความปลอดภัย User Management
- [REF_SLA_CALCULATION_FIX.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/REF_SLA_CALCULATION_FIX.md) : [PLAN] แผนการแก้ไขสูตรคำนวณ SLA (Working Hours)
- [REF_WORKFLOW_SCALABLE_UPGRADE.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/REF_WORKFLOW_SCALABLE_UPGRADE.md) : [PLAN] แผนการอัปเกรด Workflow Engine (Scalable & Integer-based)
- [REF_DASHBOARD_WORKFLOW_FIX.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/REF_DASHBOARD_WORKFLOW_FIX.md) : [PLAN] แผนการปรับปรุง Dashboard และ Incident Workflow (Phase 3)
- [IMPLEMENTATION_PLAN_INCIDENT_ACCEPT_DISPATCH_AUDIT.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/IMPLEMENTATION_PLAN_INCIDENT_ACCEPT_DISPATCH_AUDIT.md) : [PLAN] แผนปรับ Incident Accept/Dispatch ให้แยก IT Staff รับงานเอง และ Administrator มอบหมายงานตามหลัก Audit
- [IMPLEMENTATION_PLAN_SETTINGS_MENU_RESTRUCTURE.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/IMPLEMENTATION_PLAN_SETTINGS_MENU_RESTRUCTURE.md) : [PLAN] แผนปรับโครงสร้างเมนู Settings ให้แยก System Setup, Master Data, Workflow & Approval, Users & Access และ Audit & Logs
- [IMPLEMENTATION_PLAN_SETTINGS_ROUTE_SEPARATION.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/IMPLEMENTATION_PLAN_SETTINGS_ROUTE_SEPARATION.md) : [PLAN] แผนแยก route Settings ออกจาก Master Data wrapper ให้เป็นหน้าอิสระ เช่น Holidays, Incident Master Data และ Checklist Master Data
- [IMPLEMENTATION_PLAN_CHECKLIST_POINT_HISTORY_AND_PHOTO_UI.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/IMPLEMENTATION_PLAN_CHECKLIST_POINT_HISTORY_AND_PHOTO_UI.md) : [PLAN] แผนละเอียดสำหรับปรับ UX ของ Photo Evidence และออกแบบสถาปัตยกรรม point-level history / QR รายจุดให้ Fast AI ลงมือทำได้ตรง spec
- [IMPLEMENTATION_PLAN_TARGET_REGISTRY_QR_ASSET_HISTORY.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/IMPLEMENTATION_PLAN_TARGET_REGISTRY_QR_ASSET_HISTORY.md) : [PLAN] แผนลงรายละเอียดการพัฒนา Target Registry, QR Navigation และ Asset History หลัง Template Builder/Procedure Editor พร้อมแล้ว
- [IMPLEMENTATION_PLAN_SETTINGS_GUIDE_LOGS_MASTERDATA_FIX.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/IMPLEMENTATION_PLAN_SETTINGS_GUIDE_LOGS_MASTERDATA_FIX.md) : [PLAN] แผนแก้ Guide edit/content, Logs Doc No./Email/System Errors และลดขนาด Incident Master Data form
- [IMPLEMENTATION_PLAN_UNIFIED_SLA_SETTINGS_AND_CALCULATION.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/IMPLEMENTATION_PLAN_UNIFIED_SLA_SETTINGS_AND_CALCULATION.md) : [PLAN] แผนรวมศูนย์การตั้งค่า SLA, SLA Exclusion Reason, และสูตรคำนวณ SLA กลางสำหรับ Dashboard/Report/Incident Detail
- [IMPLEMENTATION_PLAN_REMOTE_APPROVE_REBUILD.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/IMPLEMENTATION_PLAN_REMOTE_APPROVE_REBUILD.md) : [PLAN] แผน Rebuild Remote Approve (Incident + Checklist) แบบ 2-step verify/sign พร้อม PIN/OTP policy และ audit contract
- [IMPLEMENTATION_PLAN_AUDIT_TRAIL_AND_LOG_VIEWER.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/IMPLEMENTATION_PLAN_AUDIT_TRAIL_AND_LOG_VIEWER.md) : [PLAN] แผนยกระดับ Audit Trail สำหรับ document/settings changes และขยายหน้า Logs กลางให้พร้อมใช้งานสำหรับการตรวจสอบระบบ
- [SCAN_SUMMARY_SETTINGS_AUDIT.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/SCAN_SUMMARY_SETTINGS_AUDIT.md) : [AUDIT] รายงานผลการตรวจสอบสถาปัตยกรรมและ UI/UX ของโมดูล Settings (Standalone Route & Responsive)
- [AUDIT_SYSTEM_GAP_ANALYSIS.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/AUDIT_SYSTEM_GAP_ANALYSIS.md) : [AUDIT] รายงานการตรวจสอบความสอดคล้องระหว่างโค้ดและมาตรฐาน (Gap Analysis)
- [INCIDENT_APPROVAL_MIGRATION.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/INCIDENT_APPROVAL_MIGRATION.md) : ประวัติการย้ายข้อมูล Workflow
- [AUDIT_REPORT_LATEST.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/AUDIT_REPORT_LATEST.md) : รายงานการตรวจสอบคุณภาพล่าสุด (PASSED)
- [AUDIT_REPORT_INCIDENT_FLOW.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/AUDIT_REPORT_INCIDENT_FLOW.md) : รายงานการตรวจสอบกระบวนการ Incident (Archive - FAILED)
- [remediation_plan_photo_evidence_spacing.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/remediation_plan_photo_evidence_spacing.md) : [PLAN] แผนการปรับปรุงระยะ Spacing ของหน้าจอสร้างเทมเพลต Photo Evidence (ui_template_type: 1)
- [remediation_plan_checklist_edit_lock.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/remediation_plan_checklist_edit_lock.md) : [PLAN] แผนติดตั้งระบบล็อกแก้ไขสำหรับป้องกันการแก้ไขข้อมูล Checklist โดยไม่ตั้งใจ (View/Edit Lock Flow)
- [audit_report_checklist_dtt_chk_2605_010.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/audit_report_checklist_dtt_chk_2605_010.md) : [AUDIT] รายงานการตรวจสอบตรรกะเงื่อนไขและกระบวนการอนุมัติสำหรับเอกสาร DTT-CHK-2605-010
- [remediation_plan_photo_compression_and_delete_on_retake.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/remediation_plan_photo_compression_and_delete_on_retake.md) : [PLAN] แผนการเพิ่มประสิทธิภาพการบีบอัดรูปภาพ 50% และการลบรูปเก่าออกจาก OneDrive อัตโนมัติเมื่อกดถ่ายใหม่
- [migration_plan.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/migration_plan.md) : [PLAN] แผน migration ที่ถูกย้ายมาจากโฟลเดอร์ `plans/` เพื่อรวมเอกสารถาวรไว้ใต้ `docs/`
- [procedure-plan-step-fields-implementation-plan.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/procedure-plan-step-fields-implementation-plan.md) : [PLAN] แผน implementation สำหรับ procedure plan step fields ที่ถูกย้ายมาจากโฟลเดอร์ `plans/`

---


## 📖 ประเภทที่ 3: คู่มือการใช้งานและเทคนิค (Manuals & Guides)
*หมวดหมู่นี้ใช้สำหรับเป็นคู่มือขั้นตอนการทำงาน (Flow) สำหรับผู้ใช้และนักพัฒนา (How-to Guides)*
**Directory:** `docs/manuals/`
- [WORKFLOW_GUIDE.md](file:///c:/Users/Lenovo/dowa-it-system/docs/manuals/WORKFLOW_GUIDE.md) : คู่มือขั้นตอนการทำงานของ Workflow (Incident & Checklist)
- [USER_MANAGEMENT_GUIDE.md](file:///c:/Users/Lenovo/dowa-it-system/docs/manuals/USER_MANAGEMENT_GUIDE.md) : คู่มือการจัดการผู้ใช้, PIN และ Onboarding Flow
- [TARGET_REGISTRY_UAT_SEED_PLAN.md](file:///c:/Users/Lenovo/dowa-it-system/docs/manuals/TARGET_REGISTRY_UAT_SEED_PLAN.md) : แผนเตรียมข้อมูล UAT สำหรับ Target Registry / QR Asset History โดยยังไม่ insert ข้อมูลจริง
- [MULTI_AGENT_WORKFLOW_GUIDE.md](file:///c:/Users/Lenovo/dowa-it-system/docs/manuals/MULTI_AGENT_WORKFLOW_GUIDE.md) : คู่มือการประสานงานทำงานร่วมกันและใช้เครื่องมือระหว่าง Antigravity และ Google Jules
- [PRODUCTION_MIGRATION_PLAYBOOK.md](file:///c:/Users/Lenovo/dowa-it-system/docs/manuals/PRODUCTION_MIGRATION_PLAYBOOK.md) : คู่มือมาตรฐานการ Migration จาก Dev ไป Production (GitHub/Vercel/Supabase), Checkpoint, Verification และ Rollback

---

## ✅ ประเภทที่ 4: Test Cases & QA Checklists
*หมวดหมู่นี้ใช้สำหรับจัดเก็บ test case, UAT checklist, และรายการตรวจสอบการทดสอบเชิงระบบ*
**Directory:** `docs/tests/`
- [SLA_UAT_CHECKLIST.md](file:///c:/Users/Lenovo/dowa-it-system/docs/tests/SLA_UAT_CHECKLIST.md) : Checklist ทดสอบ SLA ตามกติกาใหม่ (Response/Resolution, Pause, Reject, Closed-only, N/A)
- [NPM_TEST_ERROR_REGRESSION_CHECKLIST.md](file:///c:/Users/Lenovo/dowa-it-system/docs/tests/NPM_TEST_ERROR_REGRESSION_CHECKLIST.md) : Checklist ทดสอบ 4 จุด error จาก `npm test` เพื่อปิด regression ก่อนทดสอบ SLA

---

## 🏛️ ข้อมูลสถาปัตยกรรม (Core Architecture)
**Directory:** `docs/architecture/`
- [DATABASE_AND_FLOW.md](file:///c:/Users/Lenovo/dowa-it-system/docs/architecture/DATABASE_AND_FLOW.md) : โครงสร้าง Database และ Flow หลัก
- [RBAC.md](file:///c:/Users/Lenovo/dowa-it-system/docs/architecture/RBAC.md) : โครงสร้างระบบสิทธิ์การใช้งาน

---

### 🤖 AI Agent Workflow Instructions:
1. **Identify the Task:** วิเคราะห์คำสั่งจาก USER ว่าเกี่ยวกับส่วนใดของระบบ
2. **Mandatory Check:** ต้องอ่าน `INDEX.md` และ **[USER_TASKS.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/USER_TASKS.md)** ทุกครั้งก่อนเริ่มงาน
3. **Mandatory Categorization:** หากมีการเพิ่มเอกสารใหม่ **ต้อง** จัดกลุ่มให้ถูกต้องตามประเภท (Standards / History / Manuals) และบันทึกลงในโฟลเดอร์ย่อยเท่านั้น
4. **Find the Standard:** เลือกอ่านไฟล์ `.md` ในหมวดหมู่ `standards/` ที่เกี่ยวข้องกับงานก่อนเริ่มเสมอ
5. **Follow the Rules:** ปฏิบัติตาม `ZERO_HACK_POLICY.md` และกฎใน `AGENTS.md` อย่างเคร่งครัด
6. **Update Logs:** เมื่อทำงานเสร็จสิ้น ให้บันทึกผลลงใน `CHANGELOG.md` และอัปเดตสถานะใน `USER_TASKS.md` (หากเกี่ยวข้อง) ทุกครั้ง
