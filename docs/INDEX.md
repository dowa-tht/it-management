# 📘 DOWA IT System - Documentation Index

**[ATTENTION AI AGENTS]**  
This is the central documentation hub. You MUST read this file first before starting any task to understand the system's architecture and find the relevant documentation for your specific task. **DO NOT read all files unless necessary to avoid context overflow.**

**Latest Update (11-Jun-2026 16:40):** sync เอกสาร public approval link สำหรับ Incident ให้ครอบคลุม one-time consume session, resend policy, responsive public page, และ email trigger มาตรฐาน

---

## 🏛️ 1. Architecture & Core Systems (`docs/architecture/`)
เอกสารหมวดนี้เกี่ยวกับโครงสร้างพื้นฐาน การออกแบบฐานข้อมูล และระบบความปลอดภัย
- [DATABASE_AND_FLOW.md](file:///c:/Users/Lenovo/dowa-it-system/docs/architecture/DATABASE_AND_FLOW.md) : โครงสร้าง Database หลัก, ความสัมพันธ์ของตาราง, และ Workflow การทำงาน (Authentication, Checklist Engine)
- [RBAC.md](file:///c:/Users/Lenovo/dowa-it-system/docs/architecture/RBAC.md) : แผนงานและโครงสร้างของระบบสิทธิ์การใช้งาน (Role-Based Access Control) สำหรับ `admin`, `it_staff`, `employee`, `auditor`, และ `approver`
- [RBAC_PLAN_THAI.txt](file:///c:/Users/Lenovo/dowa-it-system/docs/architecture/RBAC_PLAN_THAI.txt) : บันทึกการวางแผนระบบ RBAC เริ่มต้น (Archive)

---

## 🚚 2. Migration Repo & Environment
*หมวดหมู่นี้ใช้สำหรับกติกาและขั้นตอนการย้ายระบบระหว่าง development source / environment และ production release repo / environment โดยเฉพาะ*

### Governance & Command Contract
- [DEV_PROD_OPERATING_POLICY.md](file:///c:/Users/Lenovo/dowa-it-system/docs/standards/DEV_PROD_OPERATING_POLICY.md) : กติกาหลักในการแยก development source / environment ออกจาก production release repo / environment พร้อม default mode เป็น Development Mode
- [MIGRATION_COMMAND_CONTRACT.md](file:///c:/Users/Lenovo/dowa-it-system/docs/standards/MIGRATION_COMMAND_CONTRACT.md) : สัญญาคำสั่งมาตรฐานสำหรับการสั่ง AI ให้ทำงานใน Development, Migration Planning, หรือ Production Migration Mode โดยบังคับให้เลือกโหมดก่อนแตะ production

### Migration Execution
- [PRODUCTION_MIGRATION_PLAYBOOK.md](file:///c:/Users/Lenovo/dowa-it-system/docs/manuals/PRODUCTION_MIGRATION_PLAYBOOK.md) : คู่มือมาตรฐานการ Migration จาก Dev ไป Production (GitHub/Vercel/Supabase), Checkpoint, Verification และ Rollback
- [PRODUCTION_MIGRATION_SOP.md](file:///c:/Users/Lenovo/dowa-it-system/docs/manuals/PRODUCTION_MIGRATION_SOP.md) : ขั้นตอนปฏิบัติแบบทีละลำดับสำหรับการย้าย release จาก development source ไป production repo / production Supabase
- [PRODUCTION_REBASELINE_EXECUTION_RUNBOOK.md](file:///c:/Users/Lenovo/dowa-it-system/docs/manuals/PRODUCTION_REBASELINE_EXECUTION_RUNBOOK.md) : execution runbook แบบ phase-by-phase สำหรับ production re-baseline migration ครั้งแรก ครอบคลุม freeze, extract, reset, schema apply, seed apply, selected user bootstrap, verification, และ rollback triggers
- [PRODUCTION_REBASELINE_PRODUCTION_APPLY_ORDER.md](file:///c:/Users/Lenovo/dowa-it-system/docs/manuals/PRODUCTION_REBASELINE_PRODUCTION_APPLY_ORDER.md) : ลำดับ apply สำหรับ operator ใช้ใน first production migration โดยสรุป exact schema order, seed order, stop conditions, และ release gate
- [PRODUCTION_REBASELINE_EXPORT_ARTIFACT_PLAN.md](file:///c:/Users/Lenovo/dowa-it-system/docs/manuals/PRODUCTION_REBASELINE_EXPORT_ARTIFACT_PLAN.md) : แผนเตรียม export artifacts จาก dev สำหรับ baseline-config, checklist, selected users, workflow, และ number-series พร้อม metadata และ integrity checks
- [PRODUCTION_REBASELINE_EXPORT_SQL_PACK.md](file:///c:/Users/Lenovo/dowa-it-system/docs/manuals/PRODUCTION_REBASELINE_EXPORT_SQL_PACK.md) : ชุด SQL export แบบ table-by-table สำหรับ dev Supabase พร้อม row counts และ integrity queries เพื่อสร้าง artifacts รอบแรก
- [PRODUCTION_REBASELINE_EXPORT_ROW_COUNTS_TEMPLATE.md](file:///c:/Users/Lenovo/dowa-it-system/docs/manuals/PRODUCTION_REBASELINE_EXPORT_ROW_COUNTS_TEMPLATE.md) : template สำหรับบันทึก export row counts จาก dev และ sign-off ก่อนสร้าง artifact จริง
- [PRODUCTION_REBASELINE_IMPORT_ORDER_COMMAND_PACK.md](file:///c:/Users/Lenovo/dowa-it-system/docs/manuals/PRODUCTION_REBASELINE_IMPORT_ORDER_COMMAND_PACK.md) : command pack template สำหรับวัน execute จริง โดยบังคับลำดับ schema apply, seed import, selected-user remap, stop conditions, และ execution logging
- [PRODUCTION_REBASELINE_FINAL_IN_SCOPE_TABLE_LIST.md](file:///c:/Users/Lenovo/dowa-it-system/docs/manuals/PRODUCTION_REBASELINE_FINAL_IN_SCOPE_TABLE_LIST.md) : ตารางสรุป final in-scope สำหรับการทำ production re-baseline migration ครั้งแรก พร้อม action, fields, dependency, และ note สำหรับใช้เป็นต้นฉบับของ execution runbook
- [PRODUCTION_REBASELINE_RLS_REMEDIATION_PLAN.md](file:///c:/Users/Lenovo/dowa-it-system/docs/manuals/PRODUCTION_REBASELINE_RLS_REMEDIATION_PLAN.md) : แผน remediation สำหรับ security follow-up เรื่อง `RLS disabled` โดยแยก active runtime table (`approval_substitutes`) ออกจาก legacy tables (`working_hours`, `sla_exclusions`, `sla_holidays`)
- [PRODUCTION_REBASELINE_RELEASE_INVENTORY_TEMPLATE.md](file:///c:/Users/Lenovo/dowa-it-system/docs/manuals/PRODUCTION_REBASELINE_RELEASE_INVENTORY_TEMPLATE.md) : template สำหรับ release inventory ของ first migration โดยรวม release header, scope lock, migration file list, artifact checklist, และ sign-off block
- [PRODUCTION_REBASELINE_SCHEMA_VERIFICATION_CHECKLIST.md](file:///c:/Users/Lenovo/dowa-it-system/docs/manuals/PRODUCTION_REBASELINE_SCHEMA_VERIFICATION_CHECKLIST.md) : checklist สำหรับปิด must-verify items ของ schema/runtime contract ก่อนเข้าสู่ production migration mode จริง
- [PRODUCTION_REBASELINE_SEED_EXTRACTION_MAPPING.md](file:///c:/Users/Lenovo/dowa-it-system/docs/manuals/PRODUCTION_REBASELINE_SEED_EXTRACTION_MAPPING.md) : แผน mapping วิธี extract / transform / import สำหรับแต่ละ table ใน production re-baseline migration
- [PRODUCTION_REBASELINE_SELECTED_USER_BOOTSTRAP_AND_REMAP_PLAN.md](file:///c:/Users/Lenovo/dowa-it-system/docs/manuals/PRODUCTION_REBASELINE_SELECTED_USER_BOOTSTRAP_AND_REMAP_PLAN.md) : แผน bootstrap selected users 2 รายการ, user-id mapping worksheet, remap rules, และ stop conditions ก่อน import workflow baseline
- [PRODUCTION_REBASELINE_SCOPE_DRIFT_DECISION_PACK.md](file:///c:/Users/Lenovo/dowa-it-system/docs/manuals/PRODUCTION_REBASELINE_SCOPE_DRIFT_DECISION_PACK.md) : decision pack สำหรับปิด drift ระหว่าง approved migration scope กับ runtime baseline data โดยเฉพาะ `master_data`, `target_type`, `checklist_category`, และ `per_type` mappings
- [PRODUCTION_REBASELINE_PRODUCTION_MODE_READINESS.md](file:///c:/Users/Lenovo/dowa-it-system/docs/manuals/PRODUCTION_REBASELINE_PRODUCTION_MODE_READINESS.md) : สรุปสถานะ readiness ล่าสุดของ production re-baseline ว่า planning pack พร้อมแล้วหรือยัง และยังเหลือ human gate อะไรก่อนเข้าสู่ Production Migration Mode
- [PRODUCTION_REBASELINE_VERIFICATION_RUN_SEQUENCE.md](file:///c:/Users/Lenovo/dowa-it-system/docs/manuals/PRODUCTION_REBASELINE_VERIFICATION_RUN_SEQUENCE.md) : verification pack หลัง import สำหรับตรวจ schema, row counts, dependencies, selected users, smoke test, workflow/substitute remap, และ release decision
- [PRODUCTION_REBASELINE_VERIFICATION_SQL_PACK.md](file:///c:/Users/Lenovo/dowa-it-system/docs/manuals/PRODUCTION_REBASELINE_VERIFICATION_SQL_PACK.md) : ชุด SQL verification สำหรับ production หลัง import เพื่อเช็ก schema presence, row counts, orphan mappings, selected users, workflow references, และ RLS sanity
- [PRODUCTION_REBASELINE_VERIFICATION_RESULT_TEMPLATE.md](file:///c:/Users/Lenovo/dowa-it-system/docs/manuals/PRODUCTION_REBASELINE_VERIFICATION_RESULT_TEMPLATE.md) : template สำหรับบันทึกผล verification step-by-step, critical gates, และ final release decision
- [RELEASE_AND_ROLLBACK_CHECKLIST.md](file:///c:/Users/Lenovo/dowa-it-system/docs/manuals/RELEASE_AND_ROLLBACK_CHECKLIST.md) : checklist สั้นสำหรับก่อนปล่อยจริง, หลังปล่อยจริง, และกรณีต้อง rollback

---

## 📜 3. ประเภทที่ 1: มาตรฐานการพัฒนาระบบ (Development Standards)
*หมวดหมู่นี้ใช้สำหรับให้ Agent ยึดถือเป็นหลักการและ Logic ในการพัฒนาระบบ (Source of Truth for Agents)*
**Directory:** `docs/standards/`
- [ZERO_HACK_POLICY.md](file:///c:/Users/Lenovo/dowa-it-system/docs/standards/ZERO_HACK_POLICY.md) : นโยบายห้ามใช้ UI Hacks
- [DEVELOPMENT.md](file:///c:/Users/Lenovo/dowa-it-system/docs/standards/DEVELOPMENT.md) : มาตรฐานโค้ด, Logging, Security และ structured audit contract สำหรับ document/settings changes
- [SILENT_EXECUTION.md](file:///c:/Users/Lenovo/dowa-it-system/docs/standards/SILENT_EXECUTION.md) : มาตรฐานและข้อกำหนดการประมวลผลและการรายงานตัวแบบเงียบ (Silent Thinking / Silent Execution)
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
- [roles/README.md](file:///c:/Users/Lenovo/dowa-it-system/docs/standards/roles/README.md) : สารบัญและโครงสร้างของบทบาท Agent ย่อย


---

## 📅 4. ประเภทที่ 2: บันทึกการดำเนินการและประวัติ (Implementation History)
*หมวดหมู่นี้ใช้สำหรับบันทึกความคืบหน้า ประวัติการเปลี่ยนแปลง และรายงานสถานะ (Audit Trail)*
**Directory:** `docs/history/`
- [HANDOFF_PRODUCTION_STATUS_2026_06_10.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/HANDOFF_PRODUCTION_STATUS_2026_06_10.md) : [HANDOFF] สรุปสถานะ production migration, สิ่งที่ทำแล้ว, ความเสี่ยงค้าง, และงานที่ agent ถัดไปต้องทำต่อ
- [HANDOFF_PROMPT_PRODUCTION_STATUS_2026_06_10.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/HANDOFF_PROMPT_PRODUCTION_STATUS_2026_06_10.md) : [HANDOFF] prompt พร้อมใช้สำหรับส่งต่อ agent ถัดไปให้เริ่มตรวจ production schema/data/config ต่อทันที
- [UNIFIED_WORKFLOW_STANDARD_PLAN.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/UNIFIED_WORKFLOW_STANDARD_PLAN.md): แผนการปรับปรุงมาตรฐาน Workflow ทั้งระบบ
- [WORKFLOW_REFINEMENT_PHASE_2.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/WORKFLOW_REFINEMENT_PHASE_2.md): [PLAN] แผนการปรับปรุงความเสถียร (Phase 2: Transactions & Logs)
- [UI_UX_WORKFLOW_CARD_UPGRADE.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/UI_UX_WORKFLOW_CARD_UPGRADE.md): [PLAN] แผนการอัปเกรด UI/UX เป็นแบบ Card (Phase 3)
- [CHANGELOG.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/CHANGELOG.md) : บันทึกการเปลี่ยนแปลงรายวัน
- [archive/CHANGELOG_2026_06_09.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_06_09.md) : บันทึก changelog รายวันแบบ archive สำหรับ 9-Jun-2026
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
- [IMPLEMENTATION_PLAN_PRODUCTION_CHECKLIST_CANCEL_FIX_2026_06_15.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/IMPLEMENTATION_PLAN_PRODUCTION_CHECKLIST_CANCEL_FIX_2026_06_15.md) : [PLAN] release plan สำหรับแก้ production checklist cancel ที่ล้มด้วย error `column checklist_docs.reported_by_id does not exist`
- [IMPLEMENTATION_PLAN_PRODUCTION_CHECKLIST_RECREATE_AFTER_CANCEL_FIX_2026_06_15.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/IMPLEMENTATION_PLAN_PRODUCTION_CHECKLIST_RECREATE_AFTER_CANCEL_FIX_2026_06_15.md) : [PLAN] release plan สำหรับแก้ production checklist create ให้ `Cancelled + untouched` สร้างใหม่ได้ตามมาตรฐานเดียวกับ dev
- [IMPLEMENTATION_PLAN_REMOTE_APPROVE_REBUILD.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/IMPLEMENTATION_PLAN_REMOTE_APPROVE_REBUILD.md) : [PLAN] แผน Rebuild Remote Approve (Incident + Checklist) แบบ 2-step verify/sign พร้อม PIN/OTP policy และ audit contract
- [IMPLEMENTATION_PLAN_AUDIT_TRAIL_AND_LOG_VIEWER.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/IMPLEMENTATION_PLAN_AUDIT_TRAIL_AND_LOG_VIEWER.md) : [PLAN] แผนยกระดับ Audit Trail สำหรับ document/settings changes และขยายหน้า Logs กลางให้พร้อมใช้งานสำหรับการตรวจสอบระบบ
- [SCAN_SUMMARY_SETTINGS_AUDIT.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/SCAN_SUMMARY_SETTINGS_AUDIT.md) : [AUDIT] รายงานผลการตรวจสอบสถาปัตยกรรมและ UI/UX ของโมดูล Settings (Standalone Route & Responsive)
- [AUDIT_SYSTEM_GAP_ANALYSIS.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/AUDIT_SYSTEM_GAP_ANALYSIS.md) : [AUDIT] รายงานการตรวจสอบความสอดคล้องระหว่างโค้ดและมาตรฐาน (Gap Analysis)
- [INCIDENT_APPROVAL_MIGRATION.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/INCIDENT_APPROVAL_MIGRATION.md) : ประวัติการย้ายข้อมูล Workflow
- [AUDIT_REPORT_LATEST.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/AUDIT_REPORT_LATEST.md) : รายงานการตรวจสอบคุณภาพล่าสุด (PASSED)
- [AUDIT_REPORT_INCIDENT_FLOW.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/AUDIT_REPORT_INCIDENT_FLOW.md) : รายงานการตรวจสอบกระบวนการ Incident (Archive - FAILED)
- [AUDIT_INCIDENT_ROUTE_RUNTIME_DESYNC_2026_06_08.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/AUDIT_INCIDENT_ROUTE_RUNTIME_DESYNC_2026_06_08.md) : [AUDIT] รายงานตรวจสอบปัญหา `/dashboard/incidents` ตอบ 404 ทั้งที่ route file มีอยู่จริง โดยสรุปว่าเป็น runtime route desync ของ Next.js dev server
- [AUDIT_PRODUCTION_REBASELINE_SCHEMA_VERIFICATION_2026_06_08.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/AUDIT_PRODUCTION_REBASELINE_SCHEMA_VERIFICATION_2026_06_08.md) : [AUDIT] ผลการตรวจ Schema Verification Checklist สำหรับ production re-baseline migration โดยเทียบ migrations, runtime code, และ dev Supabase schema/state จริง
- [IMPLEMENTATION_PLAN_PRODUCTION_SECURITY_HARDENING_BACKLOG.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/IMPLEMENTATION_PLAN_PRODUCTION_SECURITY_HARDENING_BACKLOG.md) : [PLAN] backlog hardening หลัง first production baseline โดยแยก `user_whitelist` policy, function execute/search_path review, audit/log policy review, และ auth password protection ออกจาก migration รอบแรก
- [remediation_plan_photo_evidence_spacing.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/remediation_plan_photo_evidence_spacing.md) : [PLAN] แผนการปรับปรุงระยะ Spacing ของหน้าจอสร้างเทมเพลต Photo Evidence (ui_template_type: 1)
- [remediation_plan_checklist_edit_lock.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/remediation_plan_checklist_edit_lock.md) : [PLAN] แผนติดตั้งระบบล็อกแก้ไขสำหรับป้องกันการแก้ไขข้อมูล Checklist โดยไม่ตั้งใจ (View/Edit Lock Flow)
- [audit_report_checklist_dtt_chk_2605_010.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/audit_report_checklist_dtt_chk_2605_010.md) : [AUDIT] รายงานการตรวจสอบตรรกะเงื่อนไขและกระบวนการอนุมัติสำหรับเอกสาร DTT-CHK-2605-010
- [remediation_plan_photo_compression_and_delete_on_retake.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/remediation_plan_photo_compression_and_delete_on_retake.md) : [PLAN] แผนการเพิ่มประสิทธิภาพการบีบอัดรูปภาพ 50% และการลบรูปเก่าออกจาก OneDrive อัตโนมัติเมื่อกดถ่ายใหม่
- [migration_plan.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/migration_plan.md) : [PLAN] แผน migration ที่ถูกย้ายมาจากโฟลเดอร์ `plans/` เพื่อรวมเอกสารถาวรไว้ใต้ `docs/`
- [procedure-plan-step-fields-implementation-plan.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/procedure-plan-step-fields-implementation-plan.md) : [PLAN] แผน implementation สำหรับ procedure plan step fields ที่ถูกย้ายมาจากโฟลเดอร์ `plans/`

---


## 📖 5. ประเภทที่ 3: คู่มือการใช้งานและเทคนิค (Manuals & Guides)
*หมวดหมู่นี้ใช้สำหรับเป็นคู่มือขั้นตอนการทำงาน (Flow) สำหรับผู้ใช้และนักพัฒนา (How-to Guides)*
**Directory:** `docs/manuals/`
- [WORKFLOW_GUIDE.md](file:///c:/Users/Lenovo/dowa-it-system/docs/manuals/WORKFLOW_GUIDE.md) : คู่มือขั้นตอนการทำงานของ Workflow (Incident & Checklist)
- [HEADLESS_AND_BACKEND_TESTING_GUIDE.md](file:///c:/Users/Lenovo/dowa-it-system/docs/manuals/HEADLESS_AND_BACKEND_TESTING_GUIDE.md) : คู่มือการทดสอบแบบไม่ต้องเปิดหน้าเว็บจริง โดยใช้ backend calls, request simulation, headless browser, และ database verification
- [USER_MANAGEMENT_GUIDE.md](file:///c:/Users/Lenovo/dowa-it-system/docs/manuals/USER_MANAGEMENT_GUIDE.md) : คู่มือการจัดการผู้ใช้, PIN และ Onboarding Flow
- [TARGET_REGISTRY_UAT_SEED_PLAN.md](file:///c:/Users/Lenovo/dowa-it-system/docs/manuals/TARGET_REGISTRY_UAT_SEED_PLAN.md) : แผนเตรียมข้อมูล UAT สำหรับ Target Registry / QR Asset History โดยยังไม่ insert ข้อมูลจริง
- [MULTI_AGENT_WORKFLOW_GUIDE.md](file:///c:/Users/Lenovo/dowa-it-system/docs/manuals/MULTI_AGENT_WORKFLOW_GUIDE.md) : คู่มือการประสานงานทำงานร่วมกันและใช้เครื่องมือระหว่าง Antigravity และ Google Jules

---

## ✅ 6. ประเภทที่ 4: Test Cases & QA Checklists
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
