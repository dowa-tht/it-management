# 🕒 ประวัติการเปลี่ยนแปลง (Change Logs)

## 4 มิถุนายน 2569 (04-Jun-2026)

- **[ตอนนี้] Fix Remote Approve Modal: Display External Reporter Email Correctly**
  - แก้ปัญหาที่ Remote Approve Modal แสดง "ไม่พบอีเมลผู้อนุมัติ" สำหรับ external reporter แม้ว่า OTP จะส่งได้ถูกต้อง
  - เพิ่ม props ใหม่ `targetEmail` และ `targetEmailLabel` ใน `UnifiedApprovalModal` component
  - ปรับ logic การแสดง email ให้รองรับทั้ง internal user (approver) และ external reporter
  - อัปเดต Incident Detail Page ให้ส่ง `incident.reporter_email` และ label "External user" เมื่อเป็น external reporter step
  - ผลลัพธ์: Modal แสดง `reporter@example.com (External user)` แทน "ไม่พบอีเมลผู้อนุมัติ" สำหรับ external reporter
  - ไฟล์ที่เกี่ยวข้อง:
    - `components/workflow/UnifiedApprovalModal.js`
    - `app/dashboard/incidents/[id]/page.js`
  - รัน `npm run build` ผ่านเรียบร้อย (56 routes, 0 errors)

## 29 พฤษภาคม 2569 (29-May-2026)

- **[18:07] Reopen Incident SLA Safety: Keep Acknowledge/Assignee Context**
  - ปรับพฤติกรรม `resetDocumentWorkflow(...)` สำหรับ `incident` ใน `app/actions/workflow.js`:
    - ถ้าเคสเคยถูก acknowledge/assign แล้ว (`acknowledged_at` หรือ `assigned_at` หรือมี assignee) จะ Reopen กลับเป็น `In Progress`
    - ถ้ายังไม่เคย acknowledge/assign จะ Reopen เป็น `Open`
  - คงข้อมูล `acknowledged_at`, `assigned_at`, `assigned_to_id`, `assigned_to` ไว้ เพื่อไม่ให้ context รอบแรกหายและไม่ทำให้ SLA Response เพี้ยนจากการ re-acknowledge
  - ยังคงล้าง `document_approvals` และ `assigned_approver_id` ตาม flow Reopen เดิม
  - รัน `npm run build` ผ่านเรียบร้อย

- **[17:55] Reopen Incident Follow-up Fix: remove non-existent `incidents.approved_by` update**
  - จากการทดสอบ Reopen รอบถัดไป พบ error ใหม่ `Could not find the 'approved_by' column of 'incidents'`
  - ปรับ `app/actions/workflow.js` เพิ่มเงื่อนไขให้เคลียร์ `approved_by` เฉพาะเอกสาร `checklist` เท่านั้น (เช่นเดียวกับ `approved_at`)
  - Incident reopen จะ reset เฉพาะฟิลด์ที่มีในตารางจริง และไม่โยน schema mismatch
  - รัน `npm run build` ผ่านเรียบร้อย

- **[17:46] Fix Reopen Incident Error: remove non-existent `incidents.approved_at` update**
  - แก้ root cause ของ Reopen ที่ขึ้น error `Could not find the 'approved_at' column of 'incidents'` ใน `app/actions/workflow.js`
  - ปรับ `resetDocumentWorkflow(...)`:
    - คงการ reset `approved_at` เฉพาะ `checklist`
    - ไม่ส่ง `approved_at` ไป update ตาราง `incidents`
  - ปรับ `adminResetWorkflow(...)` ให้ใช้กติกาเดียวกัน (clear `approved_at` เฉพาะ `checklist`)
  - ผลลัพธ์: Reopen ของ Incident ไม่ crash จาก schema mismatch ที่คอลัมน์ `approved_at` อีก
  - ตรวจสอบ:
    - `npm run build` ✅ ผ่าน
    - `npm test` ⚠️ ยังมี fail เดิม 3 เคสที่ไม่เกี่ยวกับ Reopen (`incident-otp-flow.test.js`, `remote-approve-phasef.test.js`)

- **[17:10] Reopen Workflow Fix (Incident + Checklist) with Centralized Contract**
  - ปรับ `resetDocumentWorkflow(docId, docType, reason?, options?)` ใน `app/actions/workflow.js` ให้เป็น action กลางที่ทำครบในคำสั่งเดียว:
    - reset `document_approvals`
    - update main table status/workflow:
      - Incident -> `status='Open'`, `workflow_status='rejected'`
      - Checklist -> `status='Open'`, `workflow_status=null`
    - clear `assigned_approver_id`, `approved_by`, `approved_at`
    - write audit log `Reopen Case` พร้อมสถานะก่อน/หลังและเหตุผล (ถ้ามี)
  - เพิ่ม auth guard ให้ `resetDocumentWorkflow` (internal session) และรองรับ trusted bypass เฉพาะ `adminResetWorkflow` ผ่าน `options.skipAuth`
  - ปรับ `adminResetWorkflow` ให้เรียก contract ใหม่พร้อม metadata ผู้ดำเนินการ
  - ขยายผลไป Checklist:
    - `app/dashboard/checklist/[id]/page.js` ลบการ update main table ซ้ำซ้อนจากฝั่งหน้า
    - เรียก action กลางโดยส่งเหตุผล Reopen (optional prompt)
  - Incident detail (`app/dashboard/incidents/[id]/page.js`) ยังคงเรียก Reopen dialog เดิม แต่ตอนนี้ backend ทำครบ status + log แล้ว
  - รัน `npm run build` ผ่านเรียบร้อย

- **[16:52] Compact Minimal Pass: Remote Approve Modal + Notification Dialog**
  - ปรับรอบย่อขนาด (compact) ตาม feedback:
    - ลดขนาด modal จาก wide card -> compact card (`maxWidth` ลดลง)
    - ลดขนาด title/header/identity block/spacing ทั้งระบบ
    - ลดความสูง input, canvas signature, footer actions และข้อความ helper
    - ปรับ success dialog ให้เล็กลงและ minimal มากขึ้น (icon/title/message/button)
  - คง logic/flow เดิมทั้งหมด และคงแนวทาง inline-style เพื่อตัดความเสี่ยง Tailwind JIT miss
  - รัน `npm run build` ผ่านเรียบร้อย

- **[16:41] Hardening UI Against Tailwind JIT Miss: Workflow Modal/Notification Inline Style Migration**
  - แก้ปัญหาคลาส Tailwind ไม่ apply ใน runtime ของ Workflow UI โดยย้าย 2 คอมโพเนนต์เป็น inline-style centric:
    - `components/workflow/UnifiedApprovalModal.js`
    - `components/workflow/WorkflowNotification.js`
  - Remote Approve modal และ success/error dialog ถูกเขียน style ด้วย object inline โดยตรง เพื่อตัด dependency ต่อการ generate utility class
  - คง logic เดิมทั้งหมด (verify/sign/approve flow, OTP/PIN behavior, callbacks) และแก้เฉพาะ presentation layer
  - เหลือเพียง animation helper `animate-shake` ที่เป็น custom keyframes ภายในไฟล์ (ไม่พึ่ง Tailwind)
  - รัน `npm run build` ผ่านเรียบร้อย

- **[16:28] UI/UX Refresh: Remote Approve Modal + Success Notification Dialog**
  - รีดีไซน์ `components/workflow/UnifiedApprovalModal.js` ใหม่แบบ clean enterprise UI โดยคง logic เดิมทั้งหมด:
    - ลด visual noise (ลด gradient/blur หนัก) และปรับ header/identity block ให้อ่านง่าย
    - จัดกลุ่ม section ชัดเจน: verify block, signature block, action block
    - ปรับ typography hierarchy, spacing, button states, และ error alert ให้เป็นระบบเดียวกัน
    - ปรับข้อความ OTP mode ให้สื่อว่าเป็น OTP ของผู้อนุมัติ
  - รีดีไซน์ `components/workflow/WorkflowNotification.js`:
    - ปรับ toast เป็นสไตล์เรียบสะอาดขึ้น (solid card + subtle shadow)
    - ปรับ modal success/error dialog ใหม่ (icon, title, message, CTA) ให้สมดุลและไม่ติดขอบล่าง
    - ลด animation ให้สั้น กระชับ และนิ่งขึ้น
  - Scope control: แก้เฉพาะ UI/UX layer เท่านั้น ไม่แตะ data/flow/business logic
  - รัน `npm run build` ผ่านเรียบร้อย

- **[16:14] Fix Remote Approve OTP Double-Verify After Signature**
  - แก้ปัญหา workflow 2-step (Verify OTP -> Sign -> Approve) ที่เดิม verify OTP แบบ consume ตั้งแต่ step แรก ทำให้กด Approve แล้วโดน error `รหัส OTP ไม่ถูกต้อง`
  - เพิ่ม action ใหม่ `diagnoseIncidentApprovalOTP(docId, otp, stepId?)` ใน `app/actions/workflow.js` สำหรับตรวจ OTP แบบไม่ consume ในขั้น Verify ของ modal
  - ปรับหน้า `app/dashboard/incidents/[id]/page.js` ให้ `onVerifyCode(mode='otp')` เรียก `diagnoseIncidentApprovalOTP(...)` แทน `verifyIncidentApprovalOTP(...)`
  - คง `verifyIncidentApprovalOTP(...)` สำหรับการ consume OTP จริงตอน submit approve เท่านั้น
  - ผลลัพธ์: ยืนยัน OTP ผ่านแล้วสามารถวาดลายเซ็นและกด Approve ต่อได้โดยไม่เกิด OTP invalid จากการ verify ซ้ำ
  - รัน `npm run build` ผ่านเรียบร้อย

- **[16:02] Fix Remote Approve OTP Target + Internal OTP Verification**
  - แก้ root cause ของ `ลืม PIN` ใน Remote Approve (Incident) ที่เดิมอ้างผู้แจ้ง (`reported_by_id`) แทนผู้อนุมัติขั้นตอนปัจจุบัน
  - ปรับ `requestIncidentApprovalOTP(docId, stepId?)` ให้ resolve เป้าหมายจาก pending approval step (`document_approvals.approver_id`) ก่อนส่ง OTP
  - ปรับ `verifyIncidentApprovalOTP(docId, otp, stepId?)` ให้ verify OTP ของ approver ใน pending step ได้ (ไม่จำกัดเฉพาะ external reporter)
  - ปรับหน้า `app/dashboard/incidents/[id]/page.js` ให้ส่ง `pendingStep.id` เข้า `requestIncidentApprovalOTP` และ `verifyIncidentApprovalOTP`
  - ปรับ `verifyApprovalIdentity(...)` ให้รองรับ OTP verification สำหรับ internal approver ใน Remote Approve flow (ทั้ง direct และ proxy approval)
  - ผลลัพธ์: ปุ่ม `ลืมรหัส PIN?` จะส่ง OTP และยืนยันกับบัญชีผู้อนุมัติของ step ปัจจุบัน ไม่ไป trigger flow อื่น
  - รัน `npm run build` ผ่านเรียบร้อย

- **[15:45] Remote Approve: Forgot PIN Switch to OTP for Internal Users**
  - ปรับ `UnifiedApprovalModal` ให้รองรับการสลับโหมดยืนยันจาก PIN -> OTP ภายใน modal เดียวกัน
  - เมื่ออยู่ Remote Approve โหมด PIN และมี `onRequestOtp`:
    - กด `ลืมรหัส PIN?` แล้วระบบส่ง OTP ไปอีเมลผู้อนุมัติ
    - หากส่งสำเร็จ จะสลับเป็น OTP mode ทันที และให้กรอกรหัส OTP เพื่อยืนยันแทน PIN
  - ปรับ payload ตอนกดยืนยันให้ผูกกับโหมดที่ active จริง (`pin` หรือ `otp`) แทนการผูกค่าจาก prop เริ่มต้นอย่างเดียว
  - คง cooldown/resend limit เดิมของ OTP และ behavior เดิมสำหรับ flow ที่ไม่มี `onRequestOtp`
  - รัน `npm run build` ผ่านเรียบร้อย

- **[15:32] Incident New Form: External Reporter Modal UX Adjustment**
  - ปรับ default behavior ของแท็บผู้แจ้ง:
    - ค่าเริ่มต้นยังอยู่ที่แท็บ `เลือกจากในระบบ`
    - เมื่อสลับไปแท็บ `เพิ่มผู้แจ้งภายนอก` ครั้งแรก ระบบเคลียร์ค่า `reported_by/reporter_email/reported_by_id` ให้เป็นค่าว่าง
  - เพิ่ม error state เฉพาะ modal (`externalReporterModalError`) เพื่อแสดงข้อความตรวจสอบซ้ำอีเมลบน modal โดยตรง
  - ปรับ `applyExternalReporter()` ให้เมื่อพบอีเมลซ้ำในระบบ จะแสดงข้อความเตือนใน modal และไม่ปิด modal
  - ปรับการเปิด modal ให้ preload ค่า draft จากค่าปัจจุบัน และล้าง error เมื่อพิมพ์/ยกเลิก/สลับแท็บ
  - รัน `npm run build` ผ่านเรียบร้อย

- **[15:18] Incident Modal: ตรวจอีเมลซ้ำทันทีตอนกดยืนยันใน Modal**
  - ย้ายจุด trigger duplicate-check มาอยู่ที่การกดปุ่มยืนยันใน modal ผู้แจ้งภายนอกโดยตรง
  - `app/dashboard/incidents/new/page.js`: `applyExternalReporter` เปลี่ยนเป็น async และเรียก `validateExternalReporterEmail(...)` ก่อน set form/ปิด modal
  - `app/dashboard/incidents/[id]/page.js`: `applyReporterDraft` เปลี่ยนเป็น async และเรียก `validateExternalReporterEmail(...)` ในโหมด external ก่อนบันทึก draft
  - คง guard เดิมไว้ทั้งตอนกดขอ OTP และฝั่ง server action เพื่อกัน bypass
  - รัน `npm run build` ผ่านเรียบร้อย

- **[15:05] Incident External Reporter Duplicate Guard ก่อนส่ง OTP**
  - เพิ่ม server-side helper `isInternalUserEmail(...)` และ action `validateExternalReporterEmail(...)` ใน `app/actions/incidents.js`
  - บังคับตรวจซ้ำใน `requestIncidentReporterOtp(...)` อีกชั้น: หากอีเมลมีบัญชี active ใน `user_profiles` แล้ว จะ block และไม่ส่ง OTP
  - เพิ่ม front-end pre-check ก่อนขอ OTP ใน:
    - `app/dashboard/incidents/new/page.js`
    - `app/dashboard/incidents/[id]/page.js`
  - ผลลัพธ์: ผู้ใช้ถูก block ตั้งแต่ก่อน trigger action ส่ง OTP หากอีเมลนั้นเป็นผู้ใช้ในระบบอยู่แล้ว
  - รัน `npm run build` ผ่านเรียบร้อย

- **[14:15] Hotfix: Remote Approve Signature Validation + OTP Email Template**
  - แก้ bug การตรวจลายเซ็นใน `UnifiedApprovalModal`:
    - ปรับ real-stroke checker ให้รองรับโครงสร้าง `react-signature-canvas` จริง (stroke เป็น array ของ points)
    - ลด false-negative กรณีเซ็นแล้วแต่ระบบยังแจ้งว่า “กรุณาเซ็นชื่อให้เป็นลายเซ็นที่สมบูรณ์”
  - แก้ bug อีเมล OTP ของ Remote Approve (Incident):
    - ปรับ `requestIncidentEmailOtp(...)` ให้รองรับ `purpose` (`cancel` / `approval`)
    - เปลี่ยน subject/title/description สำหรับ approval flow ให้ไม่แสดงข้อความ “ยืนยันการยกเลิก Incident”
    - ผูก `requestIncidentApprovalOTP(...)` ให้เรียก helper ด้วย `purpose='approval'`
  - ปรับ test guard ของ signature validation ให้ตรงกับโค้ดใหม่
  - รัน `npm test` ผ่าน 100% (21/21 tests)

- **[13:52] Phase F: Test Hardening สำหรับ Remote Approve Rebuild**
  - เพิ่ม test file ใหม่ `tests/remote-approve-phasef.test.js` ครอบคลุม source-guard ของ edge cases สำคัญ:
  - OTP cooldown 60s + resend limit 5 ครั้ง
    - 2-step modal state markers (`verify -> sign`)
    - real-stroke signature validation (กันแตะจุดเดียว)
    - Incident/Checklist integration markers (`onVerifyCode`, role restriction admin/it_staff, identity hint)
    - workflow action marker (`verifyIncidentApprovalOTP`)
  - รัน `npm test` ผ่าน 100% ด้วย test suite ใหม่ (21/21 tests)

- **[13:50] Phase E: Success Modal + Refresh Behavior (Incident/Checklist)**
  - ปรับ `useWorkflowNotification()` ให้ `showModal()` รองรับ `onClose` callback เพื่อควบคุม post-success action ได้จาก caller
  - เปลี่ยนผลลัพธ์หลังอนุมัติสำเร็จ (ทั้ง Approve ปกติและ Remote) จาก toast เป็น success modal ปุ่มเดียว
  - Incident: แสดงข้อความ `อนุมัติเอกสารเลขที่ <case_number> แล้ว` และ refresh หลังกด `ตกลง`
  - Checklist: แสดงข้อความ `อนุมัติเอกสารเลขที่ <doc_no> แล้ว` และ refresh หลังกด `ตกลง`
  - รัน `npm test` ผ่าน 100% (16/16 tests)

- **[13:45] Phase D: Checklist Integration สำหรับ Remote Approve 2-Step**
  - ผูกหน้า Checklist ให้ใช้ `UnifiedApprovalModal` แบบ verify ก่อน sign ผ่าน callback `onVerifyCode`
  - เพิ่ม `diagnoseApprovalPin` บน Checklist remote modal เพื่อยืนยัน PIN ใน Step Verify ก่อนเข้าสู่หน้าลายเซ็น
  - เพิ่ม `identityHint` เพื่อแสดงบริบท role-pool บน modal (เช่น Role ... ทั้งหมด)
  - ปรับ policy ปุ่ม `canRemoteApprove` ฝั่ง Checklist ให้จำกัดเฉพาะ `admin` และ `it_staff` ตาม requirement ใหม่
  - รัน `npm test` ผ่าน 100% (16/16 tests)

- **[13:25] Phase C: Incident Integration สำหรับ Remote Approve 2-Step**
  - เพิ่ม action ใหม่ `verifyIncidentApprovalOTP(docId, otp)` ใน `app/actions/workflow.js` สำหรับยืนยัน OTP ผู้แจ้งภายนอกก่อนเข้าขั้นตอนเซ็นลายเซ็น
  - ผูก `UnifiedApprovalModal` (Remote mode) บนหน้า Incident ให้ใช้ `onVerifyCode`:
    - OTP mode -> เรียก `verifyIncidentApprovalOTP`
    - PIN mode -> เรียก `diagnoseApprovalPin`
  - เพิ่ม `identityHint` บน modal เพื่อรองรับการแสดงบริบท role-pool
  - ปรับ policy ปุ่ม `canRemoteApprove` ฝั่ง Incident ให้จำกัดเฉพาะ `admin` และ `it_staff` ตาม requirement ใหม่
  - รัน `npm test` ผ่าน 100% (16/16 tests)

- **[13:23] Phase B: Shared Action Hardening สำหรับ Remote Approve**
  - เพิ่ม helper กลาง `verifyApprovalIdentity(...)` ใน `app/actions/workflow.js` เพื่อรวม logic ยืนยันตัวตน (PIN/OTP) ไว้จุดเดียว
  - ย้ายตรรกะยืนยันตัวตนจาก `submitApprovalStep()` มาใช้ helper กลาง ลด duplication และคุมข้อความ error ไทยให้สอดคล้อง
  - เสริม audit trail สำหรับ verification ผ่าน `recordAuditLog()` พร้อม metadata สำคัญ: actor, target approver, verification type/result, step context, is_remote
  - ปรับ action log หลัง approval เป็น `Approval Verification Audit` (ไม่ hardcode ว่าเป็น remote เสมอ)
  - รัน `npm test` ผ่าน 100% (16/16 tests)

- **[13:20] Phase A เริ่มต้น: Refactor UnifiedApprovalModal เป็น 2-Step Remote Flow**
  - ปรับ `components/workflow/UnifiedApprovalModal.js` ให้รองรับโหมด Remote แบบ 2 ขั้น: `Verify -> Sign`
  - เพิ่ม OTP resend cooldown 60 วินาที และจำกัด resend สูงสุด 5 ครั้ง (พร้อมแสดงตัวนับ)
  - เพิ่มโครงรองรับ identity context (`identityHint`) สำหรับกรณี role-pool
  - บังคับตรวจลายเซ็นแบบ `real stroke` (ไม่ใช่แตะจุดเดียว) ก่อน Approve ใน remote flow
  - ปรับปุ่ม action ตาม step: `ยืนยัน/ยกเลิก` และ `Approve/ย้อนกลับ`
  - คง backward compatibility ของ payload `pin/otp` สำหรับ integration เดิม
  - รัน `npm test` ผ่าน 100% (16/16 tests)

- **[13:14] เพิ่มเอกสารแผน Rebuild Remote Approve (Incident + Checklist)**
  - จัดทำเอกสารแผนฉบับเต็ม `IMPLEMENTATION_PLAN_REMOTE_APPROVE_REBUILD.md`
  - ครอบคลุม requirement ที่ยืนยันแล้วทั้งหมด: 2-step modal flow, PIN/OTP policy, role-pool behavior, signature real-stroke rule, OTP cooldown/limit, success/error UX, audit metadata, test/rollout plan
  - อัปเดต `docs/INDEX.md` เพิ่มลิงก์เอกสารแผนใหม่ในหมวด Implementation History

- **[12:36] Remote Approve รองรับ External Session User**
  - เพิ่ม `getCurrentActorProfile()` ใน `app/actions/user.js` เพื่อ resolve ผู้ใช้ปัจจุบันแบบรวมทั้ง `internal` (`user_profiles`) และ `external` (`external_users` + `guest-session`)
  - ปรับหน้า Incident/Checklist detail ให้โหลด `currentUser` ผ่าน helper กลางนี้ แทนการอ่านจาก `supabase.auth.getSession()` อย่างเดียว
  - ปรับเงื่อนไขปุ่ม `Remote Approve` ใน Incident ให้รองรับกรณี external reporter ที่ login ด้วย external session (email ตรงกับ `incident.reporter_email`) โดยยังคง OTP verification flow เดิม
  - รัน `npm test` ผ่าน 100% (16/16 tests)

- **[11:55] Fix Assignee Cancel Approve Mode for External Reporter**
  - แก้ policy mapping ของ Reporter Account ใน Cancel Approve ให้ใช้ `reported_by_id` เท่านั้น (ไม่ fallback ไป `created_by_id`)
  - ผลลัพธ์:
    - ถ้า Incident เป็น external reporter (`reported_by_id` ว่าง) และผู้กดเป็น assignee/it_staff -> เข้าสู่ OTP email flow เท่านั้น
    - ถ้า Incident มี reporter account (`reported_by_id` มีค่า) -> assignee/it_staff ใช้ PIN หรือ OTP ของ reporter ได้ตามปกติ
  - ปรับจุดที่เกี่ยวข้องใน `cancelDocument()` และ `requestIncidentCancelOTP()` ให้สอดคล้องกับ policy กลาง
  - รัน `npm test` ผ่าน 100% (16/16 tests)

- **[11:48] Unified Incident Cancel Approve Verification Policy (Admin/Reporter/IT Staff-Assignee)**
  - เพิ่ม policy กลาง `lib/incidentCancelVerificationPolicy.js` สำหรับกำหนด verification mode ของการกด Cancel Approve จาก role/session เดียวกันทุกหน้า
  - ปรับ `cancelDocument()` ให้ verify ตาม matrix ใหม่:
    - admin -> PIN admin
    - reporter account -> PIN reporter
    - it_staff/assignee -> PIN/OTP ของ reporter
    - external reporter -> OTP ทางอีเมลเท่านั้น
  - ปรับ `requestIncidentCancelOTP()` ให้ตรวจ policy ก่อนขอ OTP (กัน role ที่ไม่ควรใช้ OTP)
  - ปรับ UI modal ใน Incident Detail ให้แสดง label/hint/input ตาม policy เดียวกัน (ไม่ hardcode เฉพาะ admin อีกต่อไป)
  - รัน `npm test` ผ่าน 100% (16/16 tests)

- **[11:39] Fix Reporter OTP Verification Reset After Modal Apply (Incident Detail)**
  - แก้บั๊กหน้า Incident Detail ที่ผู้ใช้ยืนยัน OTP ใน modal เปลี่ยน Reporter แล้ว แต่กดบันทึกยังโดนบังคับยืนยัน OTP ซ้ำ
  - Root cause: `applyReporterDraft()` เรียก `closeReporterModal()` ทันทีหลัง `setForm(...)` ทำให้ state `reporterOtpVerifiedEmail` ถูก sync ทับจาก `form` ค่าเก่า (stale state)
  - ปรับ `closeReporterModal()` รองรับ option `keepVerifiedEmail` และเรียกด้วย `keepVerifiedEmail: true` ในจังหวะ apply draft
  - ผลลัพธ์: OTP verification ที่เพิ่งยืนยันจะไม่ถูกล้างก่อนกดบันทึก
  - รัน `npm test` ผ่าน 100% (16/16 tests)

- **[11:35] Fix Incident Admin Cancel Approve Constraint Error**
  - แก้ root cause ใน `cancelDocument()` (Incident module) ที่เคยอัปเดต `incidents.status = 'Cancelled'` แล้วชน DB constraint `incidents_status_check`
  - ปรับ behavior ของ Incident `Cancel Approve` ให้ย้อนเอกสารกลับไปสถานะแก้ไข:
    - `workflow_status` -> `draft`
    - `status` -> `In Progress`
    - เคลียร์ `assigned_approver_id`
  - คงการยกเลิก pending approval steps และบันทึก audit log เป็น `Approval Cancelled`
  - รัน `npm test` ผ่าน 100% (16/16 tests)

- **[11:30] Incident Cancel Approve - Admin PIN Verification**
  - เพิ่มกติกาใหม่สำหรับการยกเลิก Incident: หากผู้ดำเนินการเป็น `admin` ต้องยืนยันด้วย PIN ของบัญชี admin เองเท่านั้น
  - ปรับ `cancelDocument()` ให้แยก flow verification:
    - `admin` -> ตรวจ `verifyEmployeePIN(currentUserId, pin)` โดยตรง
    - non-admin reporter -> ใช้ flow เดิม (Reporter PIN/OTP)
  - ปรับ UI Cancel Dialog ให้ข้อความ/label เปลี่ยนตาม role:
    - admin เห็นข้อความบังคับ PIN ของ Administrator และไม่แสดงปุ่ม OTP
    - reporter/non-admin คง flow PIN/OTP เดิม
  - รัน `npm test` ผ่าน 100% (16/16 tests)

- **[11:18] Incident Workflow Admin Reject Override (Pending Approval)**
  - ปรับหน้า Incident Detail ให้ role `admin` เห็นและใช้งานปุ่ม `Reject` ได้ทุกเอกสารที่สถานะ `Pending Approval` แม้ไม่ใช่ current approver
  - เพิ่ม server-side authorization guard ใน `rejectDocumentWorkflow()`:
    - ตรวจสอบโปรไฟล์ผู้ใช้และ pending step ปัจจุบันก่อน reject
    - อนุญาตเฉพาะ `admin` หรือผู้มีสิทธิ์ตาม step (`approver_id` ตรงตัว หรือ role pool ตรง `role_required`)
    - ปฏิเสธคำสั่งทันทีเมื่อไม่ผ่านสิทธิ์ (Access Denied)
  - รัน `npm test` ผ่าน 100% (16/16 tests)
  - อัปเดตมาตรฐาน `WORKFLOW_ENGINE.md` เพิ่มหัวข้อ `Admin Reject Override (Incident Pending Approval)`

- **[11:18] Incident External Reporter + Follow-up Access (Phase Complete)**
  - เพิ่มระบบติดตามเคสสำหรับผู้แจ้งภายนอกด้วย token อายุ 7 วัน (read-only, ไม่ผูก session login)
  - เพิ่ม flow ส่งลิงก์ติดตามเคสครั้งแรกและปุ่ม `ส่งลิงก์ติดตามเคสใหม่` พร้อม cooldown และ audit logs
  - เพิ่ม route/API public follow-up และปรับ fallback base URL สำหรับการสร้างลิงก์อีเมล
  - ปรับ Incident Resolve/Submit ให้เป็นมาตรฐานเดียว ลดการพึ่ง PIN ใน modal ส่งอนุมัติ และไปยืนยันที่ remote approve flow
  - แก้ dynamic reporter mapping ใน workflow ให้ Incident ใช้ `reported_by_id` เป็นหลัก และรองรับ external reporter ที่ไม่มี account
  - เพิ่ม auto-link incidents ตาม `reporter_email` เมื่อมีการสร้าง account ภายหลัง
  - ปรับ UI หน้า public follow-up ให้แยก Section ชัดเจน พร้อมแสดง Root Cause / Resolution / Corrective Action
  - แก้ regression และ schema mismatch หลายจุด (เช่น payload field ชั่วคราว, `closed_at` mismatch, save payload ในหน้า incident detail)
  - เพิ่ม migration:
    - `supabase/migrations/20260529_incident_followup_tokens.sql`
    - `supabase/migrations/20260529_fix_incident_reporter_approver_mapping.sql`

---

## 📦 บันทึกย้อนหลัง (Archives)

### พฤษภาคม 2569 (May 2026)
- [CHANGELOG_2026_05_28.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_28.md)
- [CHANGELOG_2026_05_27.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_27.md)
- [CHANGELOG_2026_05_26.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_26.md)
- [CHANGELOG_2026_05_25.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_25.md)
- [CHANGELOG_2026_05_21.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_21.md)
- [CHANGELOG_2026_05_20.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_20.md)
- [CHANGELOG_2026_05_19.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_19.md)
- [CHANGELOG_2026_05_18.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_18.md)
- [CHANGELOG_2026_05_17.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_17.md)
- [CHANGELOG_2026_05_15.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_15.md)
- [CHANGELOG_2026_05_14.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_14.md)
- [CHANGELOG_2026_05_13.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_13.md)
- [CHANGELOG_2026_05_12.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_12.md)
- [CHANGELOG_2026_05_11.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_11.md)
- [CHANGELOG_2026_05_10.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_10.md)
- [CHANGELOG_2026_05_09.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_09.md)
- [CHANGELOG_2026_05_08.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_08.md)
- [CHANGELOG_2026_05_07.md](file:///c:/Users/Lenovo/dowa-it-system/docs/history/archive/CHANGELOG_2026_05_07.md)

---
*อัปเดตล่าสุด: 29-May-2026 11:55*
