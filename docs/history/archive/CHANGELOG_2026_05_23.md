# 🕒 ประวัติการเปลี่ยนแปลง (Change Logs) - Archive 2026-05-23

## 23 พฤษภาคม 2569 (23-May-2026)
- **21:29 +07:00 | MODULE: Setup/Workflow - Refine START and END OF WORK rules in AGENTS.md:**
  - ย้ำกฎ "START OF WORK FLOW" ว่าหากเริ่มแชทด้วยคำสั่งให้ตรวจงานทันที (ไม่พูดว่า "เริ่มงานได้") จะข้ามขั้นตอน `npm run dev` ไป
  - อัปเดตกฎ "END OF WORK CLEANUP" ให้ครอบคลุมการตรวจสอบ `CHANGELOG.md` สำหรับทำ Daily Log Shrinking อีกครั้ง ก่อนทำการ kill process localhost

- **21:27 +07:00 | MODULE: Setup/Workflow - Add START OF WORK FLOW rule to AGENTS.md:**
  - เพิ่มกฎ "START OF WORK FLOW" ลงในหัวข้อ "การทำงานของ Agent" ในเอกสาร `AGENTS.md`
  - กำหนดให้เมื่อผู้ใช้แจ้งว่า "เริ่มงานได้" AI ต้องรัน `npm run dev` และตรวจสอบการทำ Shrink ของ `CHANGELOG.md` ก่อน จากนั้นค่อยถามว่าต้องการแก้หรือตรวจฟังก์ชันไหน

- **21:25 +07:00 | MODULE: Setup/Workflow - Add END OF WORK CLEANUP rule to AGENTS.md:**
  - เพิ่มกฎ "END OF WORK CLEANUP" ลงในหัวข้อ "การทำงานของ Agent" ในเอกสาร `AGENTS.md`
  - กำหนดให้ AI ทำการ kill service ของ Node.js ทุกครั้งเมื่อจบการทำงานหรือเมื่อผู้ใช้สั่งจบงาน เพื่อป้องกันปัญหา localhost process ค้าง
  - อ้างอิงตัวอย่างการ kill แบบ force จากสคริปต์ `.me/kill_node.ps1`

- **20:47 +07:00 | MODULE: Incident — End-of-day lint cleanup for Incident Detail page:**
  - แก้ ESLint warning `@next/next/no-img-element` ในหน้า Incident Detail โดยเปลี่ยนการแสดง Digital Signature จาก raw `<img>` เป็น `next/image` `Image` component ใน [`app/dashboard/incidents/[id]/page.js`](app/dashboard/incidents/[id]/page.js)
  - เพิ่ม `import Image from 'next/image'` และกำหนด `width`, `height`, `style`, `alt`, `unoptimized` สำหรับ signature data URL เพื่อคงการแสดงผลเดิมและสอดคล้องกับ Next.js Image Component
  - ตรวจสอบด้วย `npx eslint "app/dashboard/incidents/[id]/page.js"` ผ่านเรียบร้อย ไม่มี lint output/error ✅

- **20:14 +07:00 | MODULE: Incident/Workflow — Complete Reporter OTP Flow Hardening:**
  - ปิด gap จาก audit ของ Unified Incident Reporter OTP Flow โดยแก้หน้า New Incident ให้บันทึก `reporter_email` ตั้งแต่ตอนสร้างเอกสาร รองรับ Quick Add Reporter ที่ไม่มีบัญชีถาวร
  - เพิ่ม `requestApprovalOTP()` ใน `app/actions/users.js` เพื่อ route การส่ง OTP ให้ถูกต้องระหว่าง registered user (`requestEmployeeSignatureOTP`) และ quick-added reporter (`sendQuickAddOTP`)
  - ปรับ `UnifiedApprovalModal` และ Incident Detail ให้ส่ง `approverId`/email context OTP flow เพื่อให้ Remote Approval แบบ OTP ใช้งานได้กับผู้แจ้งที่ไม่มี `user_profiles`
  - ปิด legacy `quickAddUser()` ไม่ให้สร้าง Supabase Auth/User Profile ถาวรจาก Quick Add flow อีกต่อไป
  - อัปเกรด `submitApprovalStep` และ migration `handle_approval_step` ให้บันทึก `approval_method` (`direct_login`, `direct_pin`, `direct_standard`, `remote_pin`, `remote_otp`) และแยก `verified_by_pin` ให้หมายถึง PIN จริงเท่านั้น
  - อัปเดต `WORKFLOW_ENGINE.md` ให้รองรับ Reporter Identity แบบ `reported_by_id = NULL` + `reporter_email` สำหรับ Quick Add Reporter และกำหนด Audit metadata มาตรฐานใหม่
  - เพิ่ม automated tests ใน `tests/incident-otp-flow.test.js` ครอบคลุม reporter_email persistence, OTP routing, approval method metadata และ legacy quickAddUser guard
  - รัน `npm test` ผ่าน 100% (18/18 tests passed) ✅

- **18:55 +07:00 | MODULE: Incident - Terminology Unification & Admin Reporter Editing Capability:**
  - แก้ไขปัญหาความสับสนของคำศัพท์ โดยการเปลี่ยนป้ายกำกับ UI ในหน้า Incident Detail จาก `"ผู้แจ้ง / Requester"` เป็น `"ผู้แจ้ง / Reporter"` ให้สอดคล้องกับคอลัมน์ในตารางฐานข้อมูลและ Workflow Role
  - ปรับการแสดงผลฟิลด์ผู้แจ้ง (Reporter) บนการ์ดเคสในหน้า Incident List จาก `"ผู้สร้าง: ..."` เป็น `"ผู้แจ้ง: ..."`
  - เพิ่มสิทธิ์ให้กลุ่มผู้ใช้ `admin` สามารถแก้ไขตัวเลือก **"ผู้แจ้ง / Reporter"** ได้เมื่อเข้าสู่โหมดแก้ไข (Edit Mode) โดยการผูกกับคอมโพเนนต์ `UserAutocomplete`
  - ทำการปรับปรุงหน้า `app/dashboard/incidents/[id]/page.js` และ `app/dashboard/incidents/components/UserAutocomplete.js` เพื่อแก้ไขข้อผิดพลาด ESLint (unescaped quotes ใน JSX และการแยกตัวแปร creator/reporter ใน payload ก่อนอัปเดต)
  - รันการทดสอบและ build โปรเจกต์ผ่าน Next.js production build และ `npm test` ได้ผลลัพธ์ผ่านทั้งหมด 100%

- **17:35 +07:00 | MODULE: Setup/Workflow - Function Registry maintenance and AGENTS.md rule inspection:**
  - ทำการตรวจสอบการอ้างอิงถึง `function_registry` หรือ `doc/FUNCTION_REGISTRY.md` ในไฟล์ `AGENTS.md` และสรุปกฎข้อบังคับที่ AI/Agent ต้องปฏิบัติตาม
  - อัปเดตข้อมูลตำแหน่งและหมายเลขบรรทัดของฟังก์ชันและคอมโพเนนต์ต่างๆ ในหน้าจอตั้งค่า Workflow (`app/dashboard/settings/workflow/page.js`) ในไฟล์ [`doc/FUNCTION_REGISTRY.md`](doc/FUNCTION_REGISTRY.md) เพื่อรักษาความถูกต้องของเอกสารตามจริง (รวมถึงฟังก์ชัน `WorkflowSettingsPage`, `handleSelectConfig`, `addStep`, `removeStep`, `updateStep`)
  - ลงทะเบียนฟังก์ชัน/ตัวจัดการเพิ่มเติมของหน้าจอตั้งค่า Workflow (`handleSaveGuide`, `handleAddCondition`, `handleSave`) ใน [`doc/FUNCTION_REGISTRY.md`](doc/FUNCTION_REGISTRY.md) ซึ่งไม่เคยถูกบันทึกมาก่อน

- **17:20 +07:00 | MODULE: Setup/Workflow - Fix approver_id column save error & Registry-driven UI upgrade & Add Condition Dialog:**
  - ชี้แนะการรัน SQL DDL Migration และการกู้คืนข้อมูล Workflow ผ่าน Supabase SQL Editor เพื่อแก้ไข Error `Could not find the 'approver_id' column` เนื่องจากสิทธิ์ฐานข้อมูลผ่าน MCP ถูกล็อกเป็น Read-only
  - อัปเดตหน้าจอตั้งค่า Workflow [`app/dashboard/settings/workflow/page.js`](app/dashboard/settings/workflow/page.js) ให้ทำงานตามค่าจาก Registry (`WORKFLOW_DOC_REGISTRY` และ `WORKFLOW_CONDITION_MAP`) เพื่อแก้ปัญหา Workflow หายเมื่อลบขั้นตอนอนุมัติออกหมด และเปิดให้ปุ่ม `+ เพิ่มเงื่อนไขใหม่` สามารถเปิดกล่อง Dialog ป้อนประเภท ( Incident/Checklist/Custom) เพื่อสร้างเงื่อนไขใหม่มาตั้งค่าอนุมัติได้จริงในระดับ UI
  - อัปเดตไฟล์ [`doc/FUNCTION_REGISTRY.md`](doc/FUNCTION_REGISTRY.md) เพื่อลงทะเบียนฟังก์ชันและคอมโพเนนต์สำคัญในโฟลเดอร์ `lib/` (เช่น auth, noSeries, onedrive, resend, slaUtils และ workflowRegistry)
  - รันการทดสอบระบบและตรวจสอบความเสถียรผ่าน `npm test` ทั้ง 14 การทดสอบผ่านหมด 100%

- **16:15 +07:00 | MODULE: Setup/Workflow - Fix checklist document numbers & Dashboard approval counts:**
  - ปรับปรุงการตั้งค่า `no_field` สำหรับประเภท checklist ใน [`lib/workflowRegistry.js`](lib/workflowRegistry.js) จาก `'id'` เป็น `'doc_no'` เพื่อแสดงเลขที่เอกสารในหน้ารายการอนุมัติแบบ `DTT-CHK-...` แทนเลข uuid/CHK ชั่วคราว
  - อัปเดต Server Action ใน [`app/actions/workflow.js`](app/actions/workflow.js) เพื่อดึงฟิลด์ `doc_no` ใน `getApprovalAuditLog`, `getUnifiedPendingApprovals`, และ `getUnifiedMyPendingItems`
  - เสริม Logic การกรองแบบ Defensive ใน `getUnifiedPendingApprovals` ของ [`app/actions/workflow.js`](app/actions/workflow.js) และ `getDashboardData` ของ [`app/actions/dashboard.js`](app/actions/dashboard.js) เพื่อคัดกรองขั้นตอนการอนุมัติที่เชื่อมโยงกับเอกสาร (Checklist/Incident) ที่มีสถานะเป็น `Closed` หรือ `Resolved` ออกไป ทำให้ไม่มียอดค้างแสดงในกล่อง Dashboard และหน้ารายการอนุมัติ
  - จัดทำ SQL Migration Script [`supabase/migrations/20260523_fix_stuck_daily_approvals.sql`](supabase/migrations/20260523_fix_stuck_daily_approvals.sql) เพื่อปรับสถานะของเอกสาร Checklist วันที่ 5, 6, 7 พฤษภาคมที่ค้างอยู่ในตาราง `document_approvals` ให้เป็น `approved` เพื่อล้างข้อมูลเก่าที่ค้าง
  - รันการทดสอบระบบผ่าน `npm test` ผลลัพธ์การทดสอบผ่าน 100% (14/14 tests passed)
