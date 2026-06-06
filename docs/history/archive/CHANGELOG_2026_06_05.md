# 🕒 ประวัติการเปลี่ยนแปลง (Change Logs)

## 5 มิถุนายน 2569 (05-Jun-2026)

- **[15:34] Close Documentation And OTP Regression Follow-Up For Audit Rollout**
  - **อัปเดตมาตรฐานเอกสาร audit ให้ตรงกับ implementation ล่าสุด:**
    - `docs/standards/DEVELOPMENT.md` เพิ่ม structured audit contract, hidden-fields policy, และการแยก `audit logs` ออกจาก `operational logs`
    - `docs/standards/AGENCY_QUICK_REFERENCE.md` เพิ่ม audit log mapping และ viewer contract แบบย่อ
    - `docs/INDEX.md` อัปเดต latest update และคำอธิบายเอกสารมาตรฐานที่เกี่ยวข้อง
  - **ปิด regression เดิมฝั่ง OTP / remote approval tests:**
    - ปรับ `components/workflow/UnifiedApprovalModal.js` ให้คง pattern source ที่ test เดิมคาดไว้ โดยไม่เปลี่ยนพฤติกรรม runtime ของ OTP/PIN switching
    - ปรับ `app/actions/workflow.js` ให้ `verifyIncidentApprovalOTP(docId, otp)` กลับมามี public signature ตาม test contract และแยก logic ภายในเป็น helper
    - ปรับ `app/dashboard/incidents/[id]/page.js` ให้ verify callback ฝั่ง incident ใช้ `verifyIncidentApprovalOTP(id, code)` ตาม regression contract
  - **ผลการตรวจสอบหลังแก้:**
    - `npm test` ผ่านครบ `33/33`
    - `npm run build` ผ่านสำเร็จ

- **[15:25] Deliver Audit Trail Coverage And Expanded Logs Viewer**
  - **เพิ่ม shared audit foundation สำหรับ structured logs:**
    - แยก pure helpers ไปที่ `lib/audit.js` สำหรับ `field_changes`, hidden-field filtering, JSON summarization, category classification, และ viewer normalization
    - เพิ่ม server actions ใน `app/actions/audit.js` สำหรับ `recordEntityAuditLog()` และ `recordClientAuditLog()`
    - ปรับ `app/actions/workflow.js` ให้ `recordAuditLog()` ใช้ shared helper กลาง และขยาย `getSystemLogs()` ให้รองรับ `admin` และ `backup`
  - **เพิ่ม audit trail สำหรับ document edits และ settings/master data:**
    - `app/dashboard/incidents/[id]/page.js` เพิ่ม canonical structured `Updated` audit entry หลัง save incident detail
    - `app/dashboard/checklist/[id]/page.js` เพิ่ม audit ที่จุดแก้ไขหลัก เช่น `template_data`, `start_time`, `duration`, `evaluation`, `remark`, `status`, และ `T2 completion`
    - เพิ่ม audit สำหรับ `working_hours`, `holidays`, `permissions`, `substitutes`, `master_data`
    - เพิ่ม audit ใน server actions ของ `target registry`, `checklist template`, `procedure plan`, และ `sla settings`
  - **ขยาย Logs viewer กลาง:**
    - `app/dashboard/settings/logs/page.js` เพิ่ม tabs `Admin Actions` และ `Backup Logs`
    - เพิ่ม detail modal สำหรับ `field_changes` และ metadata เพื่อใช้ review old/new values
  - **ผลการตรวจสอบหลังแก้:**
    - targeted tests ใหม่ผ่าน: `tests/audit-log-contract.test.js`, `tests/audit-log-viewer.test.js`
    - `npm run build` ผ่านสำเร็จ
    - `npm test` ยังมี fail เดิม 3 จุดในชุด OTP/remote approval tests (`tests/incident-otp-flow.test.js`, `tests/remote-approve-phasef.test.js`) โดยไม่ได้เกิดจาก audit work รอบนี้

- **[14:17] Close P2 And P3 After User Verification**
  - **ผู้ใช้ยืนยันผลทดสอบผ่านสำหรับ 2 งานค้างวันนี้:**
    - `P2. Checklist Auditor Read-Only RLS Alignment` ทดสอบผ่านแล้ว และปิดสถานะใน `docs/history/USER_TASKS.md`
    - `P3. Auditor Expiry Quick Extend In Account Management` ทดสอบผ่านแล้ว และปิดสถานะใน `docs/history/USER_TASKS.md`
  - **เอกสารที่อัปเดต:**
    - ย้าย `P2` และ `P3` ออกจากส่วน `Pending Verification`
    - บันทึกทั้งสองงานไว้ในส่วน `Verified & Closed`

- **[12:46] Add Auditor Expiry Quick Extend Controls To Account Management**
  - **เพิ่มมาตรฐานการจัดการอายุบัญชี Auditor ใน `Account Management`:**
    - `app/actions/admin.js` เพิ่ม helper กลางสำหรับ `auditor expiry` (`default = 3 days`, quick extend options `3/7/15/30`)
    - เพิ่ม action `extendAuditorExpiry(userId, days)` สำหรับ `admin` เท่านั้น พร้อมตรวจชุดวันที่ที่อนุญาต, ต่ออายุจาก `expires_at` เดิมถ้ายังไม่หมดอายุ, หรือต่อจาก `now` หากหมดอายุแล้ว
    - ถ้า `auditor` หมดอายุและ inactive อยู่ ระบบจะ reactivate กลับอัตโนมัติเมื่อมีการต่ออายุ
    - ปรับ `updateAdminUser()` ให้ clear `expires_at` เมื่อเปลี่ยน role ออกจาก `auditor` และตั้ง default `expires_at` เมื่อเปลี่ยนจาก non-auditor -> `auditor`
  - **เพิ่ม UI ที่หน้า `User Setup Dialog` แท็บ `ข้อมูลทั่วไป`:**
    - แสดง card `Auditor Access Duration` เฉพาะเมื่อ role ปัจจุบันเป็น `auditor`
    - แสดงสถานะ `Active/Expired`, `Current Expiry`, และปุ่ม `Quick Add` (`+3`, `+7`, `+15`, `+30 วัน`)
    - เพิ่ม confirm dialog ก่อนต่ออายุทุกครั้ง
    - ถ้าเปลี่ยน role เป็น `auditor` ใน dialog เดียวกัน ระบบ prefill วันหมดอายุตาม standard และบังคับให้บันทึก role ก่อนจึงจะใช้ Quick Add ได้
  - **ผลการตรวจสอบหลังแก้:**
    - `npm run build` ผ่านสำเร็จ

- **[12:18] Remove Stale Log Rows When Switching to System Errors**
  - **แก้ root cause ของข้อมูลแว้บผิดประเภทในหน้า `System Logs`:**
    - `app/dashboard/settings/logs/page.js` เดิมเก็บ `logs` จากแท็บก่อนหน้าไว้ระหว่าง fetch ทำให้เมื่อสลับไป `System Errors` ตาราง render row เดิมด้วย schema ของ system tab ชั่วคราว
    - แยก `fetchUser()` ออกเป็น mount-only effect
    - ตอนสลับ `activeTab` ให้ reset `page`, `hasMore`, `selectedLog`, `logs`, `error`, และ `loading` ก่อนเรียก `loadLogs(activeTab, 0, false)`
    - ตัดการเรียก `loadLogs()` ซ้ำจาก effect เดิมออก เพื่อลด race และการ re-render ไม่จำเป็น
  - **ผลการตรวจสอบหลังแก้:**
    - `npm run build` ผ่านสำเร็จ

- **[12:03] Separate Procedure Plan Viewer Access From Admin Manage Access**
  - **แก้ root cause ของ redirect กลับจาก `procedure-plan-editor`:**
    - `app/actions/procedure-plan.js` เดิมใช้ `requireAdminProfile()` ตั้งแต่ page data loader ทำให้ `auditor` เปิดหน้าได้ไม่ทัน render และถูก redirect กลับ `checklist-master-data`
    - เพิ่ม viewer helper ใหม่สำหรับ `internal admin` และ `internal auditor` เท่านั้น เพื่อใช้กับ `getProcedurePlanEditorPageData()`
    - เปลี่ยน page data fetch ให้ใช้ `createServerSupabaseClient()` อ่าน `checklist_procedure_plans` ผ่าน read policy เดิมของตาราง แทนการผูกกับ admin manage path
  - **สิ่งที่ยังคงเดิมเพื่อกัน regression:**
    - `saveProcedurePlan()` และ mutation path ทั้งหมดยังคงใช้ `requireAdminProfile()` แบบเดิม
    - ไม่ได้แตะ `permission_sets`, `lib/auth.js`, หรือ role schema กลาง
  - **ผลการตรวจสอบหลังแก้:**
    - `npm run build` ผ่านสำเร็จ

- **[11:42] Finalize Auditor View-Only Access for Holidays Monthly List and Checklist Master Detail Pages**
  - **เก็บจุดที่ยังหลุดใน settings read-only flow:**
    - `app/dashboard/settings/holidays/page.js` ปรับ section `Holidays In <This Month>` ให้เป็น historical view-only สำหรับ `auditor` โดยซ่อนปุ่ม edit/delete และไม่เข้า edit mode inline อีก
    - `app/dashboard/settings/_components/MasterDataScope.js` เปิดลิงก์เข้า `Procedure Plans` ให้ `auditor` กดดูรายละเอียดได้จากรายการ master data แต่ยังคง block delete เหมือนเดิม
  - **ผลกระทบเชิงพฤติกรรมที่ต้องได้:**
    - `auditor` ดูรายการวันหยุดรายเดือนได้ แต่ห้ามแก้ไข `holiday_date` หรือ `description`
    - `auditor` เข้า `Target Registry` เพื่อดู `Target Record` ได้แบบ read-only
    - `auditor` เข้า `Procedure Plan Editor` ผ่าน `planId` เพื่อดูรายละเอียดแต่ละ SOP ได้แบบ read-only
  - **ผลการตรวจสอบหลังแก้:**
    - `npm run build` ผ่านสำเร็จ

- **[11:26] Tighten Auditor Read-Only Behavior in Settings While Restoring View-Only Navigation**
  - **แก้ root cause ใน settings shared components/page-level controls:**
    - `app/dashboard/settings/_components/MasterDataScope.js` เปิด sidebar tabs, search, filter pills, guide modal, และ preview modal ให้เป็น view-only interaction สำหรับ `auditor`
    - ปิด inline edit (`span onClick`), status toggle, delete, create buttons, และลิงก์ไปหน้า editor (`checklist-template-builder`, `procedure-plan-editor`) สำหรับ `auditor`
    - `app/dashboard/settings/holidays/page.js` ทำให้ `Import CSV` ใช้งานไม่ได้สำหรับ `auditor` แต่ยังเปิด month/year navigation, year selector, search, guide, และ template download
    - `app/dashboard/settings/logs/page.js` เปิด tabs (`Approval Logs`, `Login History`, `System Errors`) และ view-only actions เช่น guide / print / export / load more / metadata button แต่คง block ปุ่ม reset workflow สำหรับ `auditor`
  - **โครงสร้างร่วมที่ปรับ:**
    - `app/dashboard/checklist/components/ActionButton.js` รองรับ `data-readonly-allowed="true"` อัตโนมัติเมื่อปุ่มไม่ได้ disabled เพื่อให้ใช้กับปุ่มดูข้อมูลได้โดยไม่ต้อง hack ทีละตัว
  - **ผลการตรวจสอบหลังแก้:**
    - `npm run build` ผ่านสำเร็จ
    - `npm test` ยัง fail 3 เคสเดิมที่ไม่เกี่ยวกับรอบนี้:
      - `tests/incident-otp-flow.test.js`
      - `tests/remote-approve-phasef.test.js`

- **[11:09] Scope Read-Only UI Locking for Auditor to Safe Read Controls Only**
  - **พบ root cause ใหม่จากการทดสอบหลัง apply SQL:**
    - อาการที่ `auditor` กดปุ่ม filter, date picker, select และ load more ไม่ได้ ไม่ได้เกิดจาก RLS เพียงอย่างเดียว
    - ต้นเหตุจริงอยู่ที่ `app/dashboard/layout.js` ซึ่ง inject CSS read-only แบบ global ไปปิด `pointer-events` ของ `button`, `input`, `select`, `textarea` เกือบทั้งหมดใน `.main-content`
  - **แนวทางแก้แบบมาตรฐาน:**
    - คงนโยบาย read-only เดิมไว้ แต่เปลี่ยนจาก block ทั้งหน้าเป็น allowlist เฉพาะ control ที่ปลอดภัยต่อการอ่านข้อมูล
    - เพิ่ม `data-readonly-allowed="true"` ให้เฉพาะ filter/date picker/view toggle/help modal/load more ใน `incident`, `checklist`, `backup`, `reports/sla` และ `components/ViewToggle.js`
    - ไม่ปลดล็อกปุ่ม mutation เช่น create/save/delete เพื่อป้องกันการขยายสิทธิ์เกิน role
  - **ผลลัพธ์เชิงตรรกะ:**
    - `auditor` ควรกลับมาใช้งาน filtering และ navigation แบบ read-only ได้
    - read-only boundary สำหรับการแก้ไขข้อมูลยังคงอยู่เหมือนเดิม

- **[15:25] Prepare Phase 2 Migration for Checklist Auditor Read-Only Access**
  - **เพิ่ม migration แบบมาตรฐานสำหรับ Checklist Auditor Read-Only:**
    - สร้างไฟล์ `supabase/migrations/20260605_checklist_auditor_readonly_rls.sql`
    - เพิ่ม helper ใหม่ `current_user_can_read_checklist_doc()` เพื่อแยก read path ของ `auditor` ออกจาก helper write path เดิม
    - ปรับ select policy ของ `checklist_docs`, `checklist_items`, `checklist_logs`, `document_approvals`, และ `checklist_item_steps` ให้ใช้ helper read-only ใหม่แทน
    - ตั้งใจไม่แก้ `current_user_can_access_checklist_doc()` ตรง ๆ เพื่อป้องกันการเผลอขยายสิทธิ์ insert/update/delete ไปยัง `auditor`
  - **สถานะการทดสอบ/ใช้งาน:**
    - ตรวจ migration file ซ้ำแล้วเรียบร้อย
    - ยังไม่ได้ apply เข้า dev database เพราะเครื่องมือ Supabase MCP รอบนี้ตอบกลับ `Cannot apply migration in read-only mode`
    - บันทึกสถานะไว้ใน `docs/history/USER_TASKS.md` เป็นงานรอ apply/verify ต่อ

- **[14:10] Fix Variable Hoisting ReferenceError for toYYYYMMDD on Incident & Checklist Pages**
  - **แก้ปัญหาปุ่มฟิลเตอร์ค้างในหน้า Incident และ IT Checklist:**
    - ย้ายฟังก์ชันจัดรูปแบบปฏิทินแบบปลอดภาษาภูมิภาค `toYYYYMMDD` ในไฟล์ `app/dashboard/incidents/page.js` และ `app/dashboard/checklist/page.js` จากท้ายไฟล์ขึ้นมาประกาศไว้ที่ด้านบนสุดของสคริปต์
    - ผลลัพธ์: เคลียร์ข้อผิดพลาดตัวแปรล่องหน (Temporal Dead Zone - TDZ) `ReferenceError: Cannot access 'toYYYYMMDD' before initialization` ได้สมบูรณ์ 100% ทำให้ตัวสคริปต์หน้าหลักรันได้อย่างราบรื่น และกู้คืนความสามารถการกดปุ่มฟิลเตอร์ทั้งหมดให้กลับมามีปฏิกิริยาโต้ตอบได้สมบูรณ์แบบทันที
