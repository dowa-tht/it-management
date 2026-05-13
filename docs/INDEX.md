# 📘 DOWA IT System - Documentation Index

**[ATTENTION AI AGENTS]**  
This is the central documentation hub. You MUST read this file first before starting any task to understand the system's architecture and find the relevant documentation for your specific task. **DO NOT read all files unless necessary to avoid context overflow.**

---

## 🏛️ 1. Architecture & Core Systems (`docs/architecture/`)
เอกสารหมวดนี้เกี่ยวกับโครงสร้างพื้นฐาน การออกแบบฐานข้อมูล และระบบความปลอดภัย
- [DATABASE_AND_FLOW.md](file:///c:/Users/Lenovo/dowa-it-system/docs/architecture/DATABASE_AND_FLOW.md) : โครงสร้าง Database หลัก, ความสัมพันธ์ของตาราง, และ Workflow การทำงาน (Authentication, Checklist Engine)
- [RBAC.md](file:///c:/Users/Lenovo/dowa-it-system/docs/architecture/RBAC.md) : แผนงานและโครงสร้างของระบบสิทธิ์การใช้งาน (Role-Based Access Control) แบบ 4 ระดับ (Admin, Supervisor, Approval, Guest)
- [RBAC_PLAN_THAI.txt](file:///c:/Users/Lenovo/dowa-it-system/docs/architecture/RBAC_PLAN_THAI.txt) : บันทึกการวางแผนระบบ RBAC เริ่มต้น (Archive)

---

## 📜 ประเภทที่ 1: มาตรฐานการพัฒนาระบบ (Development Standards)
*หมวดหมู่นี้ใช้สำหรับให้ Agent ยึดถือเป็นหลักการและ Logic ในการพัฒนาระบบ (Source of Truth for Agents)*
**Directory:** `docs/standards/`
- [ZERO_HACK_POLICY.md](file:///c:/Users/Lenovo/dowa-it-system/docs/standards/ZERO_HACK_POLICY.md) : นโยบายห้ามใช้ UI Hacks
- [DEVELOPMENT.md](file:///c:/Users/Lenovo/dowa-it-system/docs/standards/DEVELOPMENT.md) : มาตรฐานโค้ด, Logging และ Security
- [WORKFLOW_ENGINE.md](file:///c:/Users/Lenovo/dowa-it-system/docs/standards/WORKFLOW_ENGINE.md) : มาตรฐานการอนุมัติและสถานะเอกสาร
- [USER_MANAGEMENT.md](file:///c:/Users/Lenovo/dowa-it-system/docs/standards/USER_MANAGEMENT.md) : มาตรฐานการจัดการผู้ใช้และความปลอดภัย
- [PERMISSIONS.md](file:///c:/Users/Lenovo/dowa-it-system/docs/standards/PERMISSIONS.md) : มาตรฐานระบบสิทธิ์การใช้งาน
- [UI_UX_SETTING.md](file:///c:/Users/Lenovo/dowa-it-system/docs/standards/UI_UX_SETTING.md) : มาตรฐานการออกแบบหน้าจอ Master Data
- [UI_UX_SETTINGS_DESIGN_SYSTEM.md](file:///c:/Users/Lenovo/dowa-it-system/docs/standards/UI_UX_SETTINGS_DESIGN_SYSTEM.md) : มาตรฐาน Design System ของเมนู Settings ทั้งหมด อ้างอิงหน้า Permissions และกำหนด responsive สำหรับ tablet/smartphone
- [UI_UX_RESPONSIVE.md](file:///c:/Users/Lenovo/dowa-it-system/docs/standards/UI_UX_RESPONSIVE.md) : มาตรฐานหน้าจอ Multi-Device
- [ENVIRONMENT_AND_SERVER_ACTIONS.md](file:///c:/Users/Lenovo/dowa-it-system/docs/standards/ENVIRONMENT_AND_SERVER_ACTIONS.md) : มาตรฐานการจัดการ Environment Variables และ Server Actions
- [SLA_MANAGEMENT.md](file:///c:/Users/Lenovo/dowa-it-system/docs/standards/SLA_MANAGEMENT.md) : มาตรฐานการคำนวณและบริหารจัดการ SLA (KPI)
- [INCIDENT_MANAGEMENT.md](file:///c:/Users/Lenovo/dowa-it-system/docs/standards/INCIDENT_MANAGEMENT.md) : มาตรฐานการจัดการเหตุการณ์และขั้นตอนการทำงาน
- [INCIDENT_LIFECYCLE_OVERHAUL_SPEC.md](file:///c:/Users/Lenovo/dowa-it-system/docs/standards/INCIDENT_LIFECYCLE_OVERHAUL_SPEC.md) : รายละเอียดทางเทคนิคสำหรับการปรับปรุงวงจรชีวิต Incident
- [DOCUMENT_MAPPING_STANDARD.md](file:///c:/Users/Lenovo/dowa-it-system/docs/standards/DOCUMENT_MAPPING_STANDARD.md) : มาตรฐานการจับคู่ข้อมูลและสถานะ Workflow ของระบบ
- [SYSTEM_ARCHITECTURE_MAP.md](file:///c:/Users/Lenovo/dowa-it-system/docs/standards/SYSTEM_ARCHITECTURE_MAP.md) : [AGGREGATION TOOL] แผนผังโครงสร้างสถาปัตยกรรมและ Logic Flow (สำหรับ Agent)
- [AGENCY_QUICK_REFERENCE.md](file:///c:/Users/Lenovo/dowa-it-system/docs/standards/AGENCY_QUICK_REFERENCE.md) : [AGGREGATION TOOL] รวมสูตรสำเร็จ (Cheat Sheet) และคำสั่งที่ใช้บ่อย (สำหรับ Agent)

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
- [AUDIT_SYSTEM_GAP_ANALYSIS.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/AUDIT_SYSTEM_GAP_ANALYSIS.md) : [AUDIT] รายงานการตรวจสอบความสอดคล้องระหว่างโค้ดและมาตรฐาน (Gap Analysis)
- [STATUS_REPORT.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/STATUS_REPORT.md) : รายงานสถานะฟีเจอร์ปัจจุบัน
- [INCIDENT_APPROVAL_MIGRATION.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/INCIDENT_APPROVAL_MIGRATION.md) : ประวัติการย้ายข้อมูล Workflow
- [AUDIT_REPORT_LATEST.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/AUDIT_REPORT_LATEST.md) : รายงานการตรวจสอบคุณภาพล่าสุด (PASSED)
- [AUDIT_REPORT_INCIDENT_FLOW.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/AUDIT_REPORT_INCIDENT_FLOW.md) : รายงานการตรวจสอบกระบวนการ Incident (Archive - FAILED)

---

## 📖 ประเภทที่ 3: คู่มือการใช้งานและเทคนิค (Manuals & Guides)
*หมวดหมู่นี้ใช้สำหรับเป็นคู่มือขั้นตอนการทำงาน (Flow) สำหรับผู้ใช้และนักพัฒนา (How-to Guides)*
**Directory:** `docs/manuals/`
- [WORKFLOW_GUIDE.md](file:///c:/Users/Lenovo/dowa-it-system/docs/manuals/WORKFLOW_GUIDE.md) : คู่มือขั้นตอนการทำงานของ Workflow (Incident & Checklist)
- [USER_MANAGEMENT_GUIDE.md](file:///c:/Users/Lenovo/dowa-it-system/docs/manuals/USER_MANAGEMENT_GUIDE.md) : คู่มือการจัดการผู้ใช้, PIN และ Onboarding Flow

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
