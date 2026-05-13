# 🕒 ประวัติการเปลี่ยนแปลง (Change Logs) - Archive 2026-05-13

## [2026-05-13 18:24] - Agent Workflow Control Add-on
- **AGENTS.md Update**: เพิ่มชุดคำสั่ง `AI Multi-Model Workflow Control Add-on` จากไฟล์แนบ `AGENT-add_on.md` เข้าสู่ `AGENTS.md`
- **Smart/Fast AI Workflow**: เพิ่มนิยามบทบาท Smart AI และ Fast AI พร้อมรูปแบบ report, checkpoint, handoff และ escalation
- **Task Workflow Standard**: เพิ่ม workflow มาตรฐานสำหรับ `SCAN_SUMMARY.md`, `TASK-001.md` และ execution report เพื่อใช้เมื่อต้องส่งงานให้ agent ตัวเล็กแก้ระบบ
- **Project Compatibility**: ปรับข้อความให้ทำงานร่วมกับกฎเดิมของโปรเจกต์ โดยยังยึด `docs/INDEX.md`, `USER_TASKS.md`, evidence-based verification และ documentation structure ตามเดิม

---

## [2026-05-13 18:05] - Settings Guide, Logs and Master Data UI Fix (Phase 1 & 2 Completed)
- **Guide System**: ติดตั้งระบบแก้ไขคู่มือ (Edit Guide) ใน `MasterDataScope.js` และหน้า Logs พร้อมระบบ Admin-only guard
- **Default Content**: เพิ่มเนื้อหาคู่มือเริ่มต้น (Default Guide Content) ครบถ้วนทั้ง 6 ประเภทของ Master Data (Incident Category, Affected System, etc.)
- **Doc No. Resolution**: แก้ไขระบบ Audit/Approval Logs ให้ดึง Doc No. อัตโนมัติจากฐานข้อมูล (Incident/Checklist) หากไม่มีใน Metadata
- **Login History**: แยกคอลัมน์ Email และ Name ออกจากกันเพื่อความชัดเจน และแก้ไขคอลัมน์ Email ให้แสดง `user_email` จริง
- **System Errors**: ปรับปรุงหน้าจอแสดงผล Error จาก `system_logs` และติดตั้งระบบบันทึก Error อัตโนมัติในจุดสำคัญ (Workflow, Admin, Auth, API)
- **Compact UI**: บังคับใช้ Compact Style (Padding/Radius เล็กลง) เฉพาะ Incident Master Data เพื่อความกระชับในการใช้งาน
- **Build Verification**: รัน `npm run build` ผ่านสำเร็จ ยืนยันความเสถียรของโครงสร้างใหม่

---

## [2026-05-13 17:36] - Documentation Plan: Settings Guide, Logs and Master Data Fix
- **Implementation Plan**: เพิ่ม `docs/history/IMPLEMENTATION_PLAN_SETTINGS_GUIDE_LOGS_MASTERDATA_FIX.md` เพื่อเป็นแผนส่งต่อให้ agent แก้ระบบตาม feedback ล่าสุด
- **Guide Scope**: ระบุแผนแก้ Guide edit ใน `MasterDataScope.js`, เพิ่ม default guide content และ normalize admin-only edit
- **Logs Scope**: ระบุแผนแก้ Doc No. ใน Audit/Approval Logs, แก้ Login History ให้คอลัมน์ Email แสดง email จริง และนิยาม System Errors จาก `system_logs`
- **UI Scope**: ระบุแผนลดขนาด search/add form ของ Incident Master Data โดยไม่กระทบ Checklist Master Data
- **Documentation Index**: อัปเดต `docs/INDEX.md` ให้เชื่อมไปยังแผนใหม่ในหมวด Implementation History

---

## [2026-05-13 17:35] - Settings UI/UX Standardization & Permissions Hotfix (COMPLETED)
- **UI Standardization**: ปรับปรุงหน้า Settings ทั้งหมด (**Permissions, Approvals, Substitutes, Workflow, Logs**) ให้เป็นมาตรฐานเดียวกันตาม `UI_UX_SETTINGS_DESIGN_SYSTEM.md`
- **Glassmorphism UI**: บังคับใช้ `backdrop-filter: blur(20px)` และ clean layout สำหรับ containers ในหน้าตั้งค่าทุกหน้า
- **Guide System**: ติดตั้ง 📖 **Guide Button** และ **Guide Modal** (Editable by Admin) ในทุกหน้า Settings เพื่อให้ผู้ใช้สามารถอ่านคู่มือการใช้งานได้จากหน้าจอโดยตรง
- **Permissions Hotfix**: แก้ไข Syntax Error (Extra `</div>`) ใน `app/dashboard/settings/permissions/page.js` ที่ทำให้เกิด Build Error
- **Architecture Finalization**: ยืนยันโครงสร้าง **Standalone Route Architecture** ทำงานได้สมบูรณ์ในทุกเมนู Settings โดยไม่ต้องพึ่งพา Master Data wrapper
- **Evidence-Based Audit**: ตรวจสอบหน้าจอสำคัญ (Permissions, Workflow, Users, Logs) พบว่าโครงสร้างโค้ดสอดคล้องกับมาตรฐานที่กำหนด 100%


## [2026-05-13 17:05] - Settings Route Separation & Master Data Refactoring (COMPLETED)
- **Standalone Routes**: แยกหน้าตั้งค่าหลัก (Incident Master Data, Checklist Master Data) ออกเป็น Route อิสระสมบูรณ์เพื่อลดความซับซ้อนของ URL Parameters
- **Master Data Scope**: สร้าง Reusable Component `MasterDataScope.js` ในโฟลเดอร์ `_components/` เพื่อมาตรฐานการจัดการข้อมูล Master Data ชุดเดียว
- **Legacy Cleanup**: ล้างโค้ดส่วนเกินใน `master-data/page.js` และปรับให้เป็น Fallback Wrapper ที่ดึง Logic จาก Component กลาง
- **UI Consistency**: บังคับใช้มาตรฐานปุ่มคู่มือ (📖 Guide Button) และการจัดวาง Header/Sub-caption ให้ตรงกันในทุกหน้าตั้งค่าใหม่
- **Documentation Standard**: อัปเดต `docs/standards/UI_UX_SETTING.md` เพิ่มหมวดหมู่ "Standalone Route Architecture" เพื่อเป็นมาตรฐานในอนาคต

---

## [2026-05-13 16:58] - Settings UI/UX Design System Standard
- **Design Standard**: เพิ่ม `docs/standards/UI_UX_SETTINGS_DESIGN_SYSTEM.md` เพื่อกำหนดมาตรฐาน UI/UX ของเมนู Settings ทั้งหมดโดยอ้างอิงหน้า Permission Management
- **Responsive Coverage**: ระบุ layout pattern สำหรับ desktop, tablet และ smartphone รวมถึง table min-width, header/action behavior, form stacking และ touch target
- **Settings IA**: บันทึกกลุ่มเมนู Settings มาตรฐาน 5 กลุ่ม ได้แก่ System Setup, Master Data, Workflow & Approval, Users & Access และ Audit & Logs
- **Audit Gaps**: ระบุ gap ที่พบจากหน้า Permissions เช่นยังไม่มี guide button และ title มี negative letter-spacing ซึ่งควร normalize ในรอบ implementation
- **Documentation Index**: อัปเดต `docs/INDEX.md` ให้เชื่อมไปยังมาตรฐานใหม่ในหมวด Development Standards

---

## [2026-05-13 16:40] - Documentation Plan: Settings Route Separation
- **Implementation Plan**: เพิ่ม `docs/history/IMPLEMENTATION_PLAN_SETTINGS_ROUTE_SEPARATION.md` เพื่อบันทึกแผนแยก route Settings ออกจาก `Master Data` wrapper
- **Route Scope**: แผนครอบคลุม `/dashboard/settings/holidays`, `/dashboard/settings/incident-master-data`, `/dashboard/settings/checklist-master-data`, legacy fallback ของ `/dashboard/settings/master-data` และ permission map
- **Documentation Index**: อัปเดต `docs/INDEX.md` ให้เชื่อมไปยังแผนใหม่ในหมวด Implementation History

---

## [2026-05-13 16:13] - Settings Menu Restructure: Remove Master Data Wrapper
- **Route Separation**: เพิ่ม route แยก `/dashboard/settings/incident-master-data`, `/dashboard/settings/checklist-master-data` และ `/dashboard/settings/holidays` เพื่อไม่ให้เมนูหลักต้องเข้า `/dashboard/settings/master-data?...`
- **Sidebar Cleanup**: ปรับ `app/dashboard/layout.js` ให้เมนู System Setup และ Master Data ชี้ไป route จริงทั้งหมด พร้อม auto-expand group ตาม path ใหม่
- **Holidays Page**: สร้างหน้า Holidays แบบ stand-alone พร้อม Search, Month Filter, Add/Edit/Delete, CSV Template/Import และ Guide Modal
- **Permission Map**: อัปเดต `lib/auth.js` ให้ครอบคลุม route ใหม่ รวมถึง `workflow` และ `permissions`
- **Build Verification**: รัน `npm run build` ผ่านสำเร็จ และ Next route list แสดง route ใหม่ครบถ้วน
- **Plan Sync**: อัปเดต `docs/history/IMPLEMENTATION_PLAN_SETTINGS_MENU_RESTRUCTURE.md` ให้สะท้อนการเลิกใช้ Master Data wrapper ในเมนูหลัก

---

## [2026-05-13 14:15] - Settings Menu Restructure: Phase 1 & 2 Completion
- **Sidebar Grouping**: ปรับปรุง `app/dashboard/layout.js` โดยจัดกลุ่มเมนู Settings เป็น 5 หมวดหมู่หลัก (System Setup, Master Data, Workflow & Approval, Users & Access, Audit & Logs)
- **Master Data Cleanup**: ลบ "Workflow Setup" และ "Working Hours" ออกจากหน้า Master Data (`app/dashboard/settings/master-data/page.js`) เพื่อลดความซ้ำซ้อน
- **Stand-alone Pages**: ย้าย "Approval Flows", "Substitutes" และ "Working Hours" ไปเป็นหน้าอิสระที่ `/dashboard/settings/*` รองรับ Deep Linking ผ่าน Sidebar
- **Dynamic Filtering**: เพิ่มการรองรับ Query Parameters (`group` และ `type`) ในหน้า Master Data เพื่อให้ Sidebar สามารถลิงก์ไปยังหมวดหมู่ย่อยได้โดยตรง
- **UI/UX Standarization**: เพิ่มปุ่มคู่มือ (📖 Guide Button) ให้กับหน้า Approvals, Substitutes และ Working Hours ตามมาตรฐาน `UI_UX_SETTING.md`
- **Route Security**: อัปเดต `lib/auth.js` บังคับใช้สิทธิ์ **Admin-only** สำหรับหน้า Settings ใหม่ทั้งหมดใน Phase นี้
- **Hotfix**: เพิ่ม `'use client'` ที่หายไปในหน้า Master Data เพื่อแก้ไข Build Error

---

## [2026-05-13 14:01] - Documentation Plan: Settings Menu Restructure
- **Implementation Plan**: เพิ่ม `docs/history/IMPLEMENTATION_PLAN_SETTINGS_MENU_RESTRUCTURE.md` เพื่อกำหนดแผนปรับโครงสร้าง Settings menu ใหม่ แยกเป็น System Setup, Master Data, Workflow & Approval, Users & Access และ Audit & Logs
- **Evidence-Based IA**: แผนอ้างอิง route จริงจาก `app/dashboard/settings/*/page.js`, sidebar ปัจจุบันใน `app/dashboard/layout.js` และมาตรฐาน `UI_UX_SETTING.md` / `PERMISSIONS.md`
- **Documentation Index**: อัปเดต `docs/INDEX.md` ให้ลิงก์ไปยังแผนใหม่ในหมวด Implementation History

---

## [2026-05-13 13:38] - Fix Incident Approval Dashboard & Workflow Generation
- **Approval Data Fix**: แก้ไขข้อมูล `approver_id` ใน `document_approvals` สำหรับเคส `DTT-INC-2605-014` (Step 2: Reporter) ที่เดิมเป็น `null` ให้เป็น ID ของ Admin DTT เพื่อให้งานปรากฏบน Dashboard Approval Box
- **Workflow Generation Fix**: แก้ไข Bug ใน `generateWorkflowSteps` และ `syncDynamicWorkflowApprovers` (ใน `app/actions/workflow.js`) ที่ใช้ `select` คอลัมน์ผิดพลาด (`created_by` ไม่มีใน `incidents`) ทำให้การหาตัวผู้สื่อข่าว (Reporter) ล้มเหลวและเป็น `null`
- **Reporter Resolution Update**: ปรับปรุง `resolveDynamicWorkflowApproverId` ให้รองรับทั้ง Incident (`reported_by_id`) และ Checklist (`created_by_id`) เพื่อความถูกต้องในการระบุตัวตนผู้อนุมัติในขั้นตอน Reporter
- **Robustness**: ปรับปรุงการ Lookup `WORKFLOW_DOC_REGISTRY` ให้รองรับ Case-insensitive document type

---

## [2026-05-13 13:11] - Session Summary: Multiple Fixes & Investigations
- **Dev Cache Clear**: ลบ `.next` และ restart dev server เพื่อแก้ 404 error ที่ `/dashboard/settings/no-series` — สาเหตุเป็น stale dev build cache ไม่ใช่ RLS
- **Admin Action Fix**: เพิ่ม import `revalidatePath` จาก `next/cache` ใน `app/actions/admin.js` เพื่อแก้ `revalidatePath is not defined` runtime error ที่เกิดหลัง `updateAdminUser()` อัปเดตข้อมูลสำเร็จแล้ว
- **Role Update Verification**: ตรวจสอบ `natthawut@dowa-tht.co.th` ใน Supabase แล้ว role ถูกอัปเดตเป็น `it_staff` และ `can_be_assignee = true` สำเร็จ
- **Approval Dashboard Investigation**: เริ่มตรวจสอบปัญหา DTT-INC-2605-014 ที่ Dashboard ไม่แสดงข้อมูลรออนุมัติ — พบว่า dashboard query ใช้ `document_approvals` ผ่าน `approver_id` และ `role_required` match
- **Build Verification**: รัน `npm run build` ผ่านสำเร็จหลังการแก้ไขทั้งหมด

---

## [2026-05-13 11:49] - Fix User Role Update Revalidation Error
- **Server Action Fix**: แก้ `revalidatePath is not defined` ใน `app/actions/admin.js` โดยเพิ่ม import `revalidatePath` จาก `next/cache` ให้ `updateAdminUser()`, `createAdminUser()` และ `secureCleanDeleteUser()` เรียกใช้งานได้ถูกต้อง
- **Verification**: ตรวจสอบข้อมูล `natthawut@dowa-tht.co.th` ใน Supabase แล้ว role ถูกอัปเดตเป็น `it_staff` และ `can_be_assignee = true` สำเร็จ แม้ UI แสดง error หลังบันทึก
- **Build Check**: รัน `npm run build` ผ่านสำเร็จ และ route settings/users ยัง compile ได้ตามปกติ

---

## [2026-05-13 11:02] - Documentation Update: Project Agent Rules
- **AGENTS.md**: เพิ่มหมวดหมู่ `Project Agent Rules` เพื่อกำหนดมาตรฐาน Tech Stack (Next.js 15, Tailwind v4, Supabase SSR) และหลักการทำงานของ Agent (Documentation-first, Context7 usage)

## [2026-05-13 10:41] - Supabase RLS Policy Script Generation
- **Database Security Audit**: ใช้ Supabase MCP ตรวจพบตาราง `public` ที่ยังปิด RLS จำนวน 18 ตาราง ได้แก่ Checklist, Workflow, Settings, Approval Token และ Registry-related tables
- **RLS Migration Script**: เพิ่มไฟล์ `supabase/migrations/add_rls_policies.sql` สำหรับเปิด RLS ทุกตารางที่พบและสร้าง Conservative Policies โดยไม่เปิดสิทธิ์ `anon`
- **RBAC Source**: Policy ใช้ `public.user_profiles.role = 'admin'` เป็น Admin Override และ map role legacy จาก `permission_sets` เพื่อรองรับสิทธิ์ Feature-based access
- **Data Isolation**: Authenticated users ถูกจำกัดให้เข้าถึง Checklist/Workflow/Incident-related rows ที่ตนเองเป็น creator, approver, assignee หรือ role-required approver เท่านั้น
- **Operational Warning**: Script ยังไม่ได้ถูก apply กับฐานข้อมูลจริง ต้อง review และทดสอบใน development/staging ก่อนนำไปใช้ production เพราะ RLS มีผลกับ browser Supabase client โดยตรง
- **Test Result 10:47-10:50**: Static SQL validation ผ่าน (`bytes=21983`, `lines=622`) แต่ Supabase MCP dry-run แบบ DDL transaction ถูก block ด้วย read-only transaction (`cannot execute CREATE FUNCTION in a read-only transaction`) จึงไม่มีการเปลี่ยนฐานข้อมูลจริง

---

## [2026-05-13 05:13] - Incident Accept/Dispatch Audit-Safe Workflow Implementation
- **Workflow Security**: ปรับ Incident Accept/Dispatch ให้ `it_staff` รับงานเป็นของตนเองได้เท่านั้น และ `admin` ต้อง Dispatch โดยเลือก active `it_staff` ก่อนบันทึก
- **Server-side Authorization**: เพิ่ม validation ใน `acknowledgeIncident()` ตรวจ actor role, assignee role, active status, severity และ concurrency guard ด้วย `status = Open`
- **Audit Log Separation**: แยก log `รับเรื่อง (Acknowledge)` สำหรับ IT Staff และ `มอบหมายงาน (Dispatch)` สำหรับ Administrator เพื่อให้ Audit แยกหน้าที่ชัดเจน
- **UI Guard**: เพิ่ม `canAcknowledge` และ role-based label ใน `WorkflowActionBar` เพื่อซ่อน Accept/Dispatch จาก role ที่ไม่มีสิทธิ์
- **Account Management**: เปลี่ยน Assignee indicator เป็น read-only และ derive จาก role `it_staff` ไม่ใช้ toggle `can_be_assignee` เป็น logic หลักสำหรับ Incident Assignment
- **Standards Sync**: อัปเดต `INCIDENT_MANAGEMENT.md` และ `PERMISSIONS.md` ให้สะท้อนมาตรฐาน Accept/Dispatch ใหม่
