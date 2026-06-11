# Function Registry
<!-- อัปเดตโดย Smart AI ทุกครั้งที่มีการเปลี่ยนแปลง function -->

สร้างจากการอ่าน `docs/INDEX.md`, `docs/history/USER_TASKS.md`, `app/actions/*` และ `app/dashboard/**/page.js` ณ วันที่ 11 มิถุนายน 2569
อัปเดตล่าสุด: 11 มิถุนายน 2569 — เพิ่ม public approval link flow, one-time consume session, resend policy, และ public approval route/page registry

หมายเหตุ:
- Registry นี้บันทึกเฉพาะฟังก์ชัน/คอมโพเนนต์ที่พบจริงจาก source path ที่ USER ระบุ
- รายการที่เป็น helper ภายในไฟล์ระบุไว้ในหมายเหตุว่า `internal helper`
- หากชื่อหน้าที่เชิงธุรกิจไม่ชัดจากชื่อฟังก์ชัน จะใช้หมายเหตุสั้นและไม่เดาสุ่มเกินหลักฐานจากชื่อไฟล์/ชื่อฟังก์ชัน

## checklist

| ชื่อฟังก์ชัน | ไฟล์ | function name จริง | หมายเหตุ |
|---|---|---|---|
| โหลด template ที่ผูกกับ target | `app/actions/checklist-template.js` | `getTemplatesForTarget()` | Server Action, L13 |
| ตรวจสิทธิ์ admin สำหรับ template builder | `app/actions/checklist-template.js` | `requireAdminProfile()` | internal helper, L52 |
| แปลงข้อมูล template สำหรับ builder | `app/actions/checklist-template.js` | `formatBuilderTemplate()` | internal helper, L77 |
| โหลดข้อมูลหน้า Checklist Template Builder | `app/actions/checklist-template.js` | `getChecklistTemplateBuilderPageData()` | Server Action, L85 |
| บันทึก Checklist Template | `app/actions/checklist-template.js` | `saveChecklistTemplate()` | Server Action, L170 |
| ตรวจสิทธิ์ admin สำหรับ Procedure Plan | `app/actions/procedure-plan.js` | `requireAdminProfile()` | internal helper, L8 |
| แปลงข้อมูล Procedure Plan | `app/actions/procedure-plan.js` | `formatProcedurePlan()` | internal helper, L33 |
| โหลดข้อมูลหน้า Procedure Plan Editor | `app/actions/procedure-plan.js` | `getProcedurePlanEditorPageData()` | Server Action, L42 |
| บันทึก Procedure Plan | `app/actions/procedure-plan.js` | `saveProcedurePlan()` | Server Action, L63 |
| สร้าง Procedure Plan draft | `app/actions/procedure-plan.js` | `createProcedurePlanDraft()` | Server Action, L114 |
| โหลดขั้นตอน Procedure Plan | `app/actions/procedure-plan.js` | `getProcedurePlanSteps()` | Server Action, L127 |
| หน้า Checklist list | `app/dashboard/checklist/page.js` | `ChecklistListPage()` | Page component, L897 |
| ฟอร์ม/list หลัก Checklist | `app/dashboard/checklist/page.js` | `ChecklistListForm()` | page-local component, L109 |
| Card เอกสาร Checklist | `app/dashboard/checklist/page.js` | `ChecklistCard()` | page-local component, L24 |
| Modal สร้าง Checklist | `app/dashboard/checklist/page.js` | `CreateChecklistModal()` | page-local component, L597 |
| หน้า Checklist detail | `app/dashboard/checklist/[id]/page.js` | `ChecklistDetailPage()` | Page component, L129 |
| อนุมัติแทน (Remote Approve) checklist | `app/dashboard/checklist/[id]/page.js` | `handleRemoteApprove()` | page-local handler, L273; เรียก submitApprovalStep พร้อม PIN |
| Dialog instruction | `app/dashboard/checklist/[id]/page.js` | `InstructionDialog()` | page-local component, L82 |
| Dialog NG item | `app/dashboard/checklist/[id]/page.js` | `NgDialog()` | page-local component, L106 |
| Render template ตามชนิด checklist item | `app/dashboard/checklist/[id]/page.js` | `TemplateRenderer()` | page-local component, L550 |
| แสดง badge พิกัดรูปภาพ | `app/dashboard/checklist/[id]/page.js` | `formatLocationBadge()` | page-local helper, L563 |
| ขอพิกัดปัจจุบัน | `app/dashboard/checklist/[id]/page.js` | `requestCurrentLocation()` | page-local helper, L573 |
| Template อัปโหลดภาพ | `app/dashboard/checklist/[id]/page.js` | `PhotoTemplate()` | page-local component, L614 |
| Template procedure | `app/dashboard/checklist/[id]/page.js` | `ProcedureTemplate()` | page-local component, L1040 |
| Template measurement | `app/dashboard/checklist/[id]/page.js` | `MeasureTemplate()` | page-local component, L1057 |
| Template link | `app/dashboard/checklist/[id]/page.js` | `LinkTemplate()` | page-local component, L1069 |
| Template signoff | `app/dashboard/checklist/[id]/page.js` | `SignoffTemplate()` | page-local component, L1078 |
| หน้า Checklist Master Data | `app/dashboard/settings/checklist-master-data/page.js` | `ChecklistMasterDataPage()` | Page component, L5 |
| หน้า Checklist Template Builder | `app/dashboard/settings/checklist-template-builder/page.js` | `ChecklistTemplateBuilderPage()` | Page component, L5 |
| หน้า Procedure Plan Editor | `app/dashboard/settings/procedure-plan-editor/page.js` | `ProcedurePlanEditorPage()` | Page component, L5 |
| อัปโหลด/ลบรูป checklist ผ่าน OneDrive | `components/ChecklistImageUpload.js` | `ChecklistImageUpload()` | Client component, L5 |

## asset/qr

| ชื่อฟังก์ชัน | ไฟล์ | function name จริง | หมายเหตุ |
|---|---|---|---|
| รวมรายการรูปสำหรับ Asset History | `app/actions/target.js` | `buildAssetHistoryPhotoList()` | internal helper, L9 |
| แปลงเอกสารเป็น Asset History item | `app/actions/target.js` | `formatAssetHistoryDoc()` | internal helper, L37 |
| โหลดประวัติ asset ราย target | `app/actions/target.js` | `getTargetAssetHistory()` | Server Action, L54 |
| โหลดประวัติจุดตรวจราย point | `app/actions/target.js` | `getTargetPointHistory()` | Server Action, L153 |
| Resolve QR สำหรับ checklist target/point | `app/actions/target.js` | `resolveChecklistQr()` | Server Action, L255 |
| ตรวจสิทธิ์ admin สำหรับ Target Registry | `app/actions/target.js` | `requireAdminProfile()` | internal helper, L313 |
| Normalize text target payload | `app/actions/target.js` | `normalizeText()` | internal helper, L338 |
| Normalize metadata target payload | `app/actions/target.js` | `normalizeMetadata()` | internal helper, L342 |
| สร้างค่า QR target | `app/actions/target.js` | `buildQrValue()` | internal helper, L354 |
| Validate target payload | `app/actions/target.js` | `validateTargetPayload()` | internal helper, L363 |
| แปลงข้อมูล target | `app/actions/target.js` | `formatTarget()` | internal helper, L388 |
| โหลดข้อมูลหน้า Target Registry | `app/actions/target.js` | `getTargetRegistryPageData()` | Server Action, L403 |
| บันทึก checklist target | `app/actions/target.js` | `saveChecklistTarget()` | Server Action, L442 |
| ลบ checklist target | `app/actions/target.js` | `deleteChecklistTarget()` | Server Action, L508 |
| เพิ่ม target type | `app/actions/target.js` | `addTargetType()` | Server Action, L556 |
| ลบ target type | `app/actions/target.js` | `deleteTargetType()` | Server Action, L614 |
| Resolve QR แบบ public | `app/actions/public-checklist.js` | `resolveChecklistQrPublic()` | Server Action, L14 |
| แปลง target สำหรับ public display | `app/actions/public-checklist.js` | `formatTargetPublic()` | internal helper, L75 |
| โหลด public point history | `app/actions/public-checklist.js` | `getTargetPointHistoryPublic()` | Server Action, L84 |
| โหลด public target history | `app/actions/public-checklist.js` | `getTargetHistoryPublic()` | Server Action, L186 |
| หน้า Asset History ราย target | `app/dashboard/checklist/targets/[targetId]/page.js` | `TargetAssetHistoryPage()` | Page component, L17 |
| หน้า Point History รายจุด | `app/dashboard/checklist/targets/[targetId]/points/[pointId]/page.js` | `PointHistoryPage()` | Page component, L6 |
| หน้า Target Registry settings | `app/dashboard/settings/target-registry/page.js` | `TargetRegistryPage()` | Page component, L5 |

## incident

| ชื่อฟังก์ชัน | ไฟล์ | function name จริง | หมายเหตุ |
|---|---|---|---|
| สร้าง Incident | `app/actions/incidents.js` | `createIncident()` | Server Action, L20 |
| รับเรื่อง/มอบหมาย Incident | `app/actions/incidents.js` | `acknowledgeIncident()` | Server Action, L118 |
| สร้าง Supabase admin client ใน incident action | `app/actions/incidents.js` | `getAdminClient()` | internal helper, L9 |
| ออก token ติดตามเคสสำหรับ external reporter | `app/actions/incidents.js` | `issueIncidentFollowupToken()` | internal helper; hash token + 7-day TTL + ส่งอีเมล |
| ส่งลิงก์ติดตามเคสใหม่ | `app/actions/incidents.js` | `resendIncidentFollowupLink()` | Server Action; admin/it_staff only + cooldown + audit log |
| สร้าง base URL สำหรับลิงก์ public follow-up | `app/actions/incidents.js` | `buildPublicBaseUrl()` | internal helper; รองรับ env fallback |
| หน้า Incident list | `app/dashboard/incidents/page.js` | `IncidentsPage()` | Page component, L494 |
| Content หลักหน้า Incident list | `app/dashboard/incidents/page.js` | `IncidentsContent()` | page-local component, L128 |
| Card Incident | `app/dashboard/incidents/page.js` | `IncidentCard()` | page-local component, L32 |
| หน้า New Incident | `app/dashboard/incidents/new/page.js` | `NewIncidentPage()` | Page component, L368 |
| ฟอร์ม New Incident | `app/dashboard/incidents/new/page.js` | `NewIncidentForm()` | page-local component, L11 |
| โหลดข้อมูลอ้างอิง Checklist ใน New Incident | `app/dashboard/incidents/new/page.js` | `handleChecklistRef()` | page-local callback, L47 |
| โหลดผู้ใช้ปัจจุบันและ reporter_email ใน New Incident | `app/dashboard/incidents/new/page.js` | `loadCurrentUser()` | page-local callback, L68 |
| โหลด master data Incident | `app/dashboard/incidents/new/page.js` | `loadMasterData()` | page-local callback, L88 |
| โหลดเลขที่ Incident ถัดไป | `app/dashboard/incidents/new/page.js` | `loadNoSeries()` | page-local callback, L101 |
| หน้า Incident detail | `app/dashboard/incidents/[id]/page.js` | `IncidentDetailPage()` | Page component, L163; state isRemoteApprovalMode (L180) แยก Login vs Remote modal |
| CSS local Incident detail | `app/dashboard/incidents/[id]/page.js` | `PageStyles()` | page-local component, L32 |
| Format elapsed time | `app/dashboard/incidents/[id]/page.js` | `formatElapsed()` | page-local helper, L102 |
| SLA widget ใน Incident detail | `app/dashboard/incidents/[id]/page.js` | `SLAWidget()` | page-local component, L110 |
| Dialog resolve incident | `app/dashboard/incidents/[id]/page.js` | `ResolveDialog()` | page-local component, L739 |
| Dialog reopen incident | `app/dashboard/incidents/[id]/page.js` | `ReopenDialog()` | page-local component, L835 |
| Dialog acknowledge incident | `app/dashboard/incidents/[id]/page.js` | `AcknowledgeDialog()` | page-local component, L854 |
| หน้า Public Incident Follow-up | `app/public/incidents/followup/[id]/page.js` | `PublicIncidentFollowupPage()` | Public page component; read-only tracking via token |
| หน้า Incident Master Data | `app/dashboard/settings/incident-master-data/page.js` | `IncidentMasterDataPage()` | Page component, L5 |
| Autocomplete เลือก/เพิ่ม Reporter (พร้อม Quick-Add OTP flow) | `app/dashboard/incidents/components/UserAutocomplete.js` | `UserAutocomplete()` | Client component, L5 |

## workflow/approval

| ชื่อฟังก์ชัน | ไฟล์ | function name จริง | หมายเหตุ |
|---|---|---|---|
| Final approval hook | `app/actions/workflow.js` | `onDocumentFinalApproval()` | internal helper, L13 |
| หา/สร้าง reason สำหรับ System pause | `app/actions/workflow.js` | `getPendingApprovalPauseReasonId()` | internal helper |
| เปิด SLA pause window ของ incident | `app/actions/workflow.js` | `openIncidentSlaPauseWindow()` | internal helper |
| ปิด SLA pause window ของ incident | `app/actions/workflow.js` | `closeIncidentSlaPauseWindow()` | internal helper |
| บันทึก log workflow legacy wrapper | `app/actions/workflow.js` | `recordLog()` | Server Action, L55 |
| Resolve dynamic approver | `app/actions/workflow.js` | `resolveDynamicWorkflowApproverId()` | internal helper, L59 |
| Sync dynamic workflow approvers | `app/actions/workflow.js` | `syncDynamicWorkflowApprovers()` | Server Action, L72 |
| Diagnose approval PIN | `app/actions/workflow.js` | `diagnoseApprovalPin()` | Server Action, L113 |
| บันทึก system error | `app/actions/workflow.js` | `recordSystemError()` | Server Action, L199 |
| บันทึก audit log | `app/actions/workflow.js` | `recordAuditLog()` | Server Action, L218 |
| ตรวจว่า payload audit ถูก normalize แล้วหรือไม่ | `app/actions/audit.js` | `isNormalizedAuditPayload()` | internal helper; ป้องกันการ normalize ซ้ำก่อน insert ลง `system_audit_logs` |
| บันทึก structured audit log กลาง | `app/actions/audit.js` | `recordEntityAuditLog()` | Server Action; เขียน `system_audit_logs` ด้วย contract กลาง |
| resolve actor สำหรับ client audit | `app/actions/audit.js` | `resolveAuditActor()` | internal helper; ดึง session/profile ของผู้กระทำ |
| บันทึก audit จาก client mutation | `app/actions/audit.js` | `recordClientAuditLog()` | Server Action; ใช้กับ document/settings edit flows เพื่อสร้าง `field_changes` |
| แจ้งเตือน approver | `app/actions/workflow.js` | `notifyApprover()` | internal helper, L281 |
| สร้าง base URL สำหรับลิงก์อนุมัติ public | `lib/publicBaseUrl.js` | `buildPublicBaseUrl()` | helper; ใช้ env public URL ก่อน fallback ไป `VERCEL_URL` หรือ `localhost:3000` |
| แปลง doc_type ให้เข้ากับ approval_tokens | `app/actions/workflow.js` | `normalizeApprovalTokenDocumentType()` | internal helper; รองรับ constraint เก่า `incident_report` / `it_checklist` |
| ยกเลิก approval token ที่ยัง active | `app/actions/workflow.js` | `revokeApprovalTokens()` | internal helper; ใช้ตอน resend / approve / reject / cancel / reset |
| ออก public approval token | `app/actions/workflow.js` | `issuePublicApprovalToken()` | internal helper; สร้าง token 15 นาทีพร้อม one-time consume session metadata |
| ส่งเมลลิงก์อนุมัติ public | `app/actions/workflow.js` | `sendPublicApprovalLinkEmail()` | internal helper; ส่งอีเมลหา approver ไม่แยก internal/external |
| ประมวลผล action ผ่าน public approval link | `app/actions/workflow.js` | `processPublicApprovalLinkAction()` | internal helper; ตรวจ token/session ก่อนส่งต่อการ approve/reject |
| โหลด approval audit log | `app/actions/workflow.js` | `getApprovalAuditLog()` | Server Action, L327 |
| โหลด pending approvals รวม | `app/actions/workflow.js` | `getUnifiedPendingApprovals()` | Server Action, L426 |
| โหลด my pending items รวม | `app/actions/workflow.js` | `getUnifiedMyPendingItems()` | Server Action, L517 |
| โหลด system logs | `app/actions/workflow.js` | `getSystemLogs()` | Server Action, L579 |
| Apply initial signatures to workflow | `app/actions/workflow.js` | `applySignaturesToWorkflow()` | internal helper, L710 |
| Submit request เข้า workflow | `app/actions/workflow.js` | `submitRequest()` | Server Action, L821; เมื่อมี approver step แรกจะ trigger public approval email |
| Generate workflow steps | `app/actions/workflow.js` | `generateWorkflowSteps()` | Server Action, L923 |
| โหลดสถานะ workflow ของเอกสาร | `app/actions/workflow.js` | `getDocumentWorkflowStatus()` | Server Action, L1011 |
| Preview potential workflow steps | `app/actions/workflow.js` | `getPotentialWorkflowSteps()` | Server Action, L1034 |
| Reject document workflow | `app/actions/workflow.js` | `rejectDocumentWorkflow()` | Server Action, L1103 |
| Submit approval step | `app/actions/workflow.js` | `submitApprovalStep()` | Server Action, L1141 |
| Submit approval step ผ่าน public link | `app/actions/workflow.js` | `submitApprovalStepByPublicLink()` | Server Action; ใช้ one-time session token อนุมัติ/ปฏิเสธจากหน้า public approve |
| Migration helper workflow | `app/actions/workflow.js` | `runWorkflowMigration()` | Server Action, L1237 |
| Reset document workflow | `app/actions/workflow.js` | `resetDocumentWorkflow()` | Server Action, L1323 |
| Admin reset workflow | `app/actions/workflow.js` | `adminResetWorkflow()` | Server Action, L1340 |
| Update approval config | `app/actions/workflow.js` | `updateApprovalConfig()` | Server Action, L1401 |
| ส่งลิงก์อนุมัติ Incident ใหม่ | `app/actions/workflow.js` | `resendIncidentApprovalLink()` | Server Action; อนุญาตเฉพาะ sender หรือ `admin` ขณะสถานะ `Pending Approval` |
| ยกเลิกเอกสาร (Checklist/Incident) | `app/actions/workflow.js` | `cancelDocument()` | Server Action; Incident ใช้ policy กลางตาม role (admin PIN, reporter PIN, assignee/it_staff ใช้ reporter PIN/OTP, external reporter OTP เท่านั้น) |
| ขอ OTP ยืนยันการยกเลิก Incident | `app/actions/workflow.js` | `requestIncidentCancelOTP()` | Server Action; อนุญาตเฉพาะ role ที่ policy กลางอนุญาต OTP |
| ขอ OTP ยืนยันการอนุมัติ Incident | `app/actions/workflow.js` | `requestIncidentApprovalOTP()` | Server Action; ส่ง OTP ให้ Reporter email ก่อน submitApprovalStep |
| Policy กลางสำหรับ Cancel Approve (Incident) | `lib/incidentCancelVerificationPolicy.js` | `deriveIncidentCancelVerificationPolicy()` | helper; matrix admin PIN / reporter PIN / assignee-it_staff reporter PIN-OTP / external reporter OTP |
| หน้า Approvals | `app/dashboard/approvals/page.js` | `ApprovalsPage()` | Page component, L274 |
| Badge สถานะ approvals | `app/dashboard/approvals/page.js` | `StatusBadge()` | page-local component, L23 |
| Badge category approvals | `app/dashboard/approvals/page.js` | `CategoryBadge()` | page-local component, L37 |
| Format date/time approvals | `app/dashboard/approvals/page.js` | `formatDateTime()` | page-local helper, L49 |
| Tab pending approvals | `app/dashboard/approvals/page.js` | `PendingTab()` | page-local component, L58 |
| Tab audit log approvals | `app/dashboard/approvals/page.js` | `AuditLogTab()` | page-local component, L131 |
| หน้า My Pending | `app/dashboard/my-pending/page.js` | `MyPendingPage()` | Page component, L7 |
| หน้า Workflow Settings | `app/dashboard/settings/workflow/page.js` | `WorkflowSettingsPage()` | Page component, L6 |
| Modal เซ็นอนุมัติแบบรวม | `components/workflow/UnifiedApprovalModal.js` | `UnifiedApprovalModal()` | Client component, L13 |
| Action bar ตามสถานะ workflow | `components/workflow/WorkflowActionBar.js` | `WorkflowActionBar()` | Client component, L7 |
| Progress ย่อยของ workflow ในรายการ | `components/workflow/WorkflowMiniProgress.js` | `WorkflowMiniProgress()` | Client component, L3 |
| Hook แจ้งเตือน workflow | `components/workflow/WorkflowNotification.js` | `useWorkflowNotification()` | Client hook/helper, L5 |
| Progress bar workflow รายละเอียด | `components/workflow/WorkflowProgressBar.js` | `WorkflowProgressBar()` | Client component, L8 |

## public/api routes

| ชื่อฟังก์ชัน | ไฟล์ | function name จริง | หมายเหตุ |
|---|---|---|---|
| อ่านข้อมูลติดตามเคสแบบไม่ล็อกอิน | `app/api/incidents/followup/route.js` | `GET()` | Route Handler; validate token hash + expiry + revoke + return read-only incident payload |
| ตรวจและผูก one-time public approval session | `app/api/approval/verify/route.js` | `GET()` | Route Handler; validate token + bind browser session cookie + preload document context สำหรับหน้า approve |

## public/pages

| ชื่อฟังก์ชัน | ไฟล์ | function name จริง | หมายเหตุ |
|---|---|---|---|
| หน้า Public Approval | `app/approve/page.js` | `ApprovePage()` | Public page component; responsive approve/reject form สำหรับ incident/checklist |

## auth/user-management

| ชื่อฟังก์ชัน | ไฟล์ | function name จริง | หมายเหตุ |
|---|---|---|---|
| Deprecated auth action placeholder | `app/actions/auth.js` | `deprecated()` | Server Action placeholder, L4 |
| Login unified | `app/actions/login.js` | `unifiedLogin()` | Server Action, L11 |
| ตรวจ onboarding ภายใน login | `app/actions/login.js` | `checkOnboardingInternal()` | internal helper, L93 |
| โหลด onboarding status | `app/actions/login.js` | `getOnboardingStatus()` | Server Action, L138 |
| Validate onboarding token | `app/actions/onboarding.js` | `validateOnboardingToken()` | Server Action, L13 |
| Complete onboarding | `app/actions/onboarding.js` | `completeOnboarding()` | Server Action, L37 |
| Request account recovery | `app/actions/recovery.js` | `requestRecovery()` | Server Action, L10 |
| Reset PIN ด้วย token | `app/actions/recovery.js` | `resetPINWithToken()` | Server Action, L137 |
| Request password OTP | `app/actions/recovery.js` | `requestPasswordOTP()` | Server Action, L188 |
| Verify password OTP | `app/actions/recovery.js` | `verifyPasswordOTP()` | Server Action, L251 |
| Reset password ด้วย token | `app/actions/recovery.js` | `resetPasswordWithToken()` | Server Action, L296 |
| โหลด session ผู้ใช้ปัจจุบัน | `app/actions/user.js` | `getCurrentUserSession()` | Server Action, L7 |
| เปลี่ยน external PIN | `app/actions/user.js` | `changeExternalPIN()` | Server Action, L62 |
| Request signature PIN reset | `app/actions/user.js` | `requestSignaturePinReset()` | Server Action, L105 |
| Search users | `app/actions/users.js` | `searchUsers()` | Server Action, L11 |
| Quick add user | `app/actions/users.js` | `quickAddUser()` | Server Action, L29 |
| Request employee signature OTP | `app/actions/users.js` | `requestEmployeeSignatureOTP()` | Server Action, L134 |
| Verify employee signature OTP | `app/actions/users.js` | `verifyEmployeeSignatureOTP()` | Server Action, L206 |
| Verify employee PIN | `app/actions/users.js` | `verifyEmployeePIN()` | Server Action, L260 |
| Check user tier | `app/actions/status.js` | `checkUserTier()` | Server Action, L3 |
| หน้า Profile | `app/dashboard/profile/page.js` | `ProfilePage()` | Page component, L439 |
| Profile content | `app/dashboard/profile/page.js` | `ProfileContent()` | page-local component, L8 |
| หน้า Users settings | `app/dashboard/settings/users/page.js` | `UsersPage()` | Page component, L454 |
| Action button หน้า Users | `app/dashboard/settings/users/page.js` | `ActionButton()` | page-local component, L9 |
| Dialog ยืนยัน password | `app/dashboard/settings/users/page.js` | `PasswordConfirmDialog()` | page-local component, L40 |
| Dialog setup user | `app/dashboard/settings/users/page.js` | `UserSetupDialog()` | page-local component, L99 |
| Dialog clean delete user | `app/dashboard/settings/users/page.js` | `CleanDeleteDialog()` | page-local component, L401 |

## setup/admin

| ชื่อฟังก์ชัน | ไฟล์ | function name จริง | หมายเหตุ |
|---|---|---|---|
| Record admin action | `app/actions/admin.js` | `recordAdminAction()` | internal helper, L12 |
| Create admin user | `app/actions/admin.js` | `createAdminUser()` | Server Action, L34 |
| ผูก incident เดิมเข้ากับ user ใหม่อัตโนมัติจาก reporter email | `app/actions/admin.js` | `autoLinkIncidentsByReporterEmail()` | internal helper; update `reported_by_id` for legacy external incidents |
| Get admin users | `app/actions/admin.js` | `getAdminUsers()` | Server Action, L178 |
| Update admin user | `app/actions/admin.js` | `updateAdminUser()` | Server Action, L203 |
| Update admin user password | `app/actions/admin.js` | `updateAdminUserPassword()` | Server Action, L238 |
| Clean delete user | `app/actions/admin.js` | `cleanDeleteUser()` | Server Action, L257 |
| Secure clean delete user | `app/actions/admin.js` | `secureCleanDeleteUser()` | Server Action, L264 |
| Get user identities | `app/actions/admin.js` | `getUserIdentities()` | Server Action, L296 |
| Update admin user PIN | `app/actions/admin.js` | `updateAdminUserPin()` | Server Action, L313 |
| Unlock user PIN | `app/actions/admin.js` | `unlockUserPin()` | Server Action, L340 |
| โหลดข้อมูลหน้า SLA Settings | `app/actions/sla-settings.js` | `getSLASettingsPageData()` | Server Action |
| บันทึก SLA targets | `app/actions/sla-settings.js` | `saveSLATargets()` | Server Action |
| บันทึก/สลับสถานะ SLA exclusion reason | `app/actions/sla-settings.js` | `saveSLAExclusionReason()` | Server Action |
| normalize SLA limits | `lib/slaUtils.js` | `normalizeSlaLimits()` | helper |
| resolve SLA limits by severity | `lib/slaUtils.js` | `getIncidentSlaLimits()` | helper |
| คำนวณคะแนน SLA ต่อ incident | `lib/slaUtils.js` | `calculateSlaScoreFromSnapshot()` | helper |
| คำนวณ snapshot SLA กลาง | `lib/slaUtils.js` | `calculateIncidentSlaSnapshot()` | helper |
| สร้าง Supabase admin client สำหรับ No Series | `app/actions/noSeries.js` | `getAdminClient()` | internal helper, L6 |
| Get verified next no | `app/actions/noSeries.js` | `getVerifiedNextNo()` | Server Action, L17 |
| หน้า Holidays settings | `app/dashboard/settings/holidays/page.js` | `HolidaysPage()` | Page component, L179 |
| Card surface หน้า Holidays | `app/dashboard/settings/holidays/page.js` | `SurfaceCard()` | page-local component, L58 |
| Stat card หน้า Holidays | `app/dashboard/settings/holidays/page.js` | `StatCard()` | page-local component, L62 |
| Section title หน้า Holidays | `app/dashboard/settings/holidays/page.js` | `SectionTitle()` | page-local component, L77 |
| Badge หน้า Holidays | `app/dashboard/settings/holidays/page.js` | `Badge()` | page-local component, L89 |
| สร้าง ISO date จาก year/month/day | `app/dashboard/settings/holidays/page.js` | `toIsoDate()` | page-local helper, L120 |
| Format holiday date display | `app/dashboard/settings/holidays/page.js` | `formatDateDisplay()` | page-local helper, L126 |
| Normalize holiday date | `app/dashboard/settings/holidays/page.js` | `normalizeHolidayDate()` | page-local helper, L133 |
| Build month calendar grid | `app/dashboard/settings/holidays/page.js` | `buildMonthGrid()` | page-local helper, L148 |
| Get month accent | `app/dashboard/settings/holidays/page.js` | `getMonthAccent()` | page-local helper, L160 |
| หน้า Working Hours settings | `app/dashboard/settings/working-hours/page.js` | `WorkingHoursPage()` | Page component, L140 |
| Card surface หน้า Working Hours | `app/dashboard/settings/working-hours/page.js` | `SurfaceCard()` | page-local component, L68 |
| Stat card หน้า Working Hours | `app/dashboard/settings/working-hours/page.js` | `StatCard()` | page-local component, L72 |
| Section title หน้า Working Hours | `app/dashboard/settings/working-hours/page.js` | `SectionTitle()` | page-local component, L82 |
| Badge หน้า Working Hours | `app/dashboard/settings/working-hours/page.js` | `Badge()` | page-local component, L94 |
| Format minutes | `app/dashboard/settings/working-hours/page.js` | `formatMinutes()` | page-local helper, L124 |
| Calculate daily working minutes | `app/dashboard/settings/working-hours/page.js` | `calculateDailyMinutes()` | page-local helper, L132 |
| หน้า No Series settings | `app/dashboard/settings/no-series/page.js` | `NoSeriesPage()` | Page component, L41 |
| Action button หน้า No Series | `app/dashboard/settings/no-series/page.js` | `ActionButton()` | page-local component, L11 |
| หน้า Permissions settings | `app/dashboard/settings/permissions/page.js` | `PermissionsPage()` | Page component, L15 |
| หน้า Substitutes settings | `app/dashboard/settings/substitutes/page.js` | `SubstitutesPage()` | Page component, L7 |
| หน้า Logs settings | `app/dashboard/settings/logs/page.js` | `LogsPage()` | Page component, L7 |
| แปลงรายละเอียด log ให้ render-safe | `app/dashboard/settings/logs/page.js` | `renderLogDetailsText()` | page-local helper; รองรับ `details` แบบ string/object และ `details_text` |
| หน้า Master Data settings | `app/dashboard/settings/master-data/page.js` | `MasterDataPage()` | Page component, L9 |

## settings expanded scan (setup/admin)

| ชื่อฟังก์ชัน | ไฟล์ | function name จริง | หมายเหตุ |
|---|---|---|---|
| สร้าง draft checklist template ว่าง | `app/dashboard/settings/checklist-template-builder/ChecklistTemplateBuilderClient.js` | `createEmptyTemplate()` | Client component helper, L11 |
| Client หลัก Checklist Template Builder | `app/dashboard/settings/checklist-template-builder/ChecklistTemplateBuilderClient.js` | `ChecklistTemplateBuilderClient()` | Client component, L26 |
| ปิด save feedback modal | `app/dashboard/settings/checklist-template-builder/ChecklistTemplateBuilderClient.js` | `closeSaveFeedback()` | component-local helper, L113 |
| Apply template draft ใน builder | `app/dashboard/settings/checklist-template-builder/ChecklistTemplateBuilderClient.js` | `applyTemplate()` | component-local helper, L117 |
| อัปเดต field ของ template draft | `app/dashboard/settings/checklist-template-builder/ChecklistTemplateBuilderClient.js` | `updateField()` | component-local helper, L125 |
| อัปเดต template_config field | `app/dashboard/settings/checklist-template-builder/ChecklistTemplateBuilderClient.js` | `updateConfigField()` | component-local helper, L141 |
| เริ่มสร้าง template ใหม่ | `app/dashboard/settings/checklist-template-builder/ChecklistTemplateBuilderClient.js` | `handleCreateNew()` | component-local handler, L151 |
| บันทึก template จาก builder | `app/dashboard/settings/checklist-template-builder/ChecklistTemplateBuilderClient.js` | `handleSave()` | component-local handler, L156 |
| ข้อความช่วยเหลือ field template form | `app/dashboard/settings/checklist-template-builder/components/TemplateForm.js` | `FieldHint()` | Client component helper, L7 |
| Section title template form | `app/dashboard/settings/checklist-template-builder/components/TemplateForm.js` | `SectionTitle()` | Client component helper, L12 |
| ฟอร์มแก้ไข Checklist Template | `app/dashboard/settings/checklist-template-builder/components/TemplateForm.js` | `TemplateForm()` | Client component, L22 |
| Toggle target mapping ใน template form | `app/dashboard/settings/checklist-template-builder/components/TemplateForm.js` | `toggleTarget()` | component-local handler, L75 |
| Apply bulk behavior ให้ target mappings | `app/dashboard/settings/checklist-template-builder/components/TemplateForm.js` | `applyBulkBehavior()` | component-local handler, L90 |
| อัปเดต behavior override ของ target mapping | `app/dashboard/settings/checklist-template-builder/components/TemplateForm.js` | `updateTargetBehavior()` | component-local handler, L104 |
| อัปเดต template_config override ของ target mapping | `app/dashboard/settings/checklist-template-builder/components/TemplateForm.js` | `updateTargetConfig()` | component-local handler, L123 |
| Preview Checklist Template | `app/dashboard/settings/checklist-template-builder/components/TemplatePreview.js` | `TemplatePreview()` | Client component, L6 |
| สร้าง procedure step ว่าง | `app/dashboard/settings/procedure-plan-editor/ProcedurePlanEditorClient.js` | `createBlankStep()` | Client component helper, L9 |
| สร้าง procedure plan ว่าง | `app/dashboard/settings/procedure-plan-editor/ProcedurePlanEditorClient.js` | `createEmptyPlan()` | Client component helper, L23 |
| Client หลัก Procedure Plan Editor | `app/dashboard/settings/procedure-plan-editor/ProcedurePlanEditorClient.js` | `ProcedurePlanEditorClient()` | Client component, L32 |
| เลือก procedure plan | `app/dashboard/settings/procedure-plan-editor/ProcedurePlanEditorClient.js` | `selectPlan()` | component-local helper, L53 |
| อัปเดต field ของ procedure plan | `app/dashboard/settings/procedure-plan-editor/ProcedurePlanEditorClient.js` | `updatePlanField()` | component-local helper, L61 |
| เพิ่ม procedure step | `app/dashboard/settings/procedure-plan-editor/ProcedurePlanEditorClient.js` | `addStep()` | component-local handler, L68 |
| อัปเดต procedure step | `app/dashboard/settings/procedure-plan-editor/ProcedurePlanEditorClient.js` | `updateStep()` | component-local handler, L76 |
| อัปเดต evidence rule ของ procedure step | `app/dashboard/settings/procedure-plan-editor/ProcedurePlanEditorClient.js` | `updateEvidenceRule()` | component-local handler, L91 |
| ลบ procedure step | `app/dashboard/settings/procedure-plan-editor/ProcedurePlanEditorClient.js` | `removeStep()` | component-local handler, L109 |
| ย้ายลำดับ procedure step | `app/dashboard/settings/procedure-plan-editor/ProcedurePlanEditorClient.js` | `moveStep()` | component-local handler, L131 |
| เริ่มสร้าง procedure plan ใหม่ | `app/dashboard/settings/procedure-plan-editor/ProcedurePlanEditorClient.js` | `handleNewPlan()` | component-local handler, L158 |
| บันทึก procedure plan จาก editor | `app/dashboard/settings/procedure-plan-editor/ProcedurePlanEditorClient.js` | `handleSave()` | component-local handler, L192 |
| Wrapper หน้า Master Data standalone | `app/dashboard/settings/_components/MasterDataScope.js` | `MasterDataStandalonePage()` | Client component, L115 |
| Content หลัก Master Data scope | `app/dashboard/settings/_components/MasterDataScope.js` | `MasterDataContent()` | Client component, L123 |
| โหลดรายการ Master Data ตาม active type | `app/dashboard/settings/_components/MasterDataScope.js` | `fetchItems()` | component-local async helper, L165 |
| โหลด Procedure Plans สำหรับ Master Data | `app/dashboard/settings/_components/MasterDataScope.js` | `fetchProcedurePlans()` | component-local async helper, L182 |
| เพิ่ม master data มาตรฐาน | `app/dashboard/settings/_components/MasterDataScope.js` | `handleAddStandard()` | component-local handler, L241 |
| เปิด preview checklist template ใน Master Data | `app/dashboard/settings/_components/MasterDataScope.js` | `handlePreviewTemplate()` | component-local handler, L251 |
| บันทึก guide content ของ Master Data | `app/dashboard/settings/_components/MasterDataScope.js` | `handleSaveGuide()` | component-local handler, L256 |
| ลบรายการ Master Data/Checklist Template/Procedure Plan | `app/dashboard/settings/_components/MasterDataScope.js` | `handleDelete()` | component-local handler, L268 |
| Toggle active status ของ Master Data/Template | `app/dashboard/settings/_components/MasterDataScope.js` | `handleToggle()` | component-local handler, L275 |
| ดาวน์โหลด CSV template Holidays | `app/dashboard/settings/holidays/page.js` | `downloadCSVTemplate()` | page-local handler, L350 |
| เปลี่ยนเดือน Calendar Holidays | `app/dashboard/settings/holidays/page.js` | `stepMonth()` | page-local handler, L430 |
| เปิดเดือนใน Calendar Holidays | `app/dashboard/settings/holidays/page.js` | `openMonth()` | page-local handler, L436 |
| กลับไปวันที่ปัจจุบันใน Holidays | `app/dashboard/settings/holidays/page.js` | `jumpToToday()` | page-local handler, L441 |
| ดาวน์โหลด CSV template No Series | `app/dashboard/settings/no-series/page.js` | `handleDownloadTemplate()` | page-local handler, L115 |
| อัปโหลดไฟล์ No Series CSV | `app/dashboard/settings/no-series/page.js` | `handleFileUpload()` | page-local handler, L130 |
| แปลงวันที่ No Series เป็น display format | `app/dashboard/settings/no-series/page.js` | `toDisplayDate()` | page-local helper, L225 |
| แปลงวันที่ display format เป็น date value | `app/dashboard/settings/no-series/page.js` | `fromDisplayDate()` | page-local helper, L232 |
| สร้าง preview เลข No Series | `app/dashboard/settings/no-series/page.js` | `getPreview()` | page-local helper, L259 |
| เปลี่ยนสิทธิ์ในหน้า Permissions | `app/dashboard/settings/permissions/page.js` | `handleChange()` | page-local handler, L82 |
| Reset edits หน้า Permissions | `app/dashboard/settings/permissions/page.js` | `handleReset()` | page-local handler, L90 |
| โหลด logs เพิ่ม | `app/dashboard/settings/logs/page.js` | `handleLoadMore()` | page-local handler, L67 |
| Render timestamp logs | `app/dashboard/settings/logs/page.js` | `renderTimestamp()` | page-local helper, L73 |
| เปิด reset workflow จาก log | `app/dashboard/settings/logs/page.js` | `handleOpenReset()` | page-local handler, L87 |
| Style tab ใน User Setup Dialog | `app/dashboard/settings/users/page.js` | `tabStyle()` | dialog-local helper, L223 |
| Handle create user result | `app/dashboard/settings/users/page.js` | `handleCreateResult()` | page-local handler, L610 |
| Toggle working day | `app/dashboard/settings/working-hours/page.js` | `handleToggleDay()` | page-local handler, L204 |
| เลือก workflow config | `app/dashboard/settings/workflow/page.js` | `handleSelectConfig()` | page-local handler, L156 |
| เพิ่ม workflow step ใน settings | `app/dashboard/settings/workflow/page.js` | `addStep()` | page-local handler, L161 |
| ลบ workflow step ใน settings | `app/dashboard/settings/workflow/page.js` | `removeStep()` | page-local handler, L166 |
| อัปเดต workflow step ใน settings | `app/dashboard/settings/workflow/page.js` | `updateStep()` | page-local handler, L172 |
| แปลง metadata target เป็น text | `app/dashboard/settings/target-registry/TargetRegistryClient.js` | `metadataToText()` | Client helper, L23 |
| Normalize base URL สำหรับ QR preview | `app/dashboard/settings/target-registry/TargetRegistryClient.js` | `normalizeBaseUrl()` | Client helper, L30 |
| สร้าง public URL สำหรับ QR preview | `app/dashboard/settings/target-registry/TargetRegistryClient.js` | `buildAbsolutePublicUrl()` | Client helper, L42 |
| Hydrate target draft จาก record | `app/dashboard/settings/target-registry/TargetRegistryClient.js` | `hydrateTargetDraft()` | Client helper, L49 |
| Compose metadata จาก target draft | `app/dashboard/settings/target-registry/TargetRegistryClient.js` | `composeMetadataFromDraft()` | Client helper, L63 |
| สร้าง options target type จาก targets | `app/dashboard/settings/target-registry/TargetRegistryClient.js` | `getTargetTypeOptions()` | Client helper, L79 |
| ฟอร์ม Target Registry | `app/dashboard/settings/target-registry/TargetRegistryClient.js` | `TargetForm()` | Client component, L219 |
| ดาวน์โหลด QR image | `app/dashboard/settings/target-registry/TargetRegistryClient.js` | `handleDownloadQr()` | TargetForm local handler, L246 |
| Client หลัก Target Registry | `app/dashboard/settings/target-registry/TargetRegistryClient.js` | `TargetRegistryClient()` | Client component, L451 |
| อัปเดต target draft | `app/dashboard/settings/target-registry/TargetRegistryClient.js` | `updateTargetDraft()` | component-local helper, L487 |
| บันทึก checklist target | `app/dashboard/settings/target-registry/TargetRegistryClient.js` | `saveTarget()` | component-local handler, L491 |

หมายเหตุการสแกนเพิ่มเติม:
- `app/actions/settings.js` ไม่มีไฟล์จริงใน workspace ณ รอบสแกนนี้
- `components/settings/**` ไม่มีไฟล์จริงใน workspace ณ รอบสแกนนี้

## dashboard/reports/sla

| ชื่อฟังก์ชัน | ไฟล์ | function name จริง | หมายเหตุ |
|---|---|---|---|
| โหลดข้อมูล Dashboard | `app/actions/dashboard.js` | `getDashboardData()` | Server Action, L6 |
| โหลด SLA report data | `app/actions/reports.js` | `getSLAReportData()` | Server Action, L5 |
| บันทึก SLA settings (legacy path) | `app/actions/reports.js` | `saveSLASettings()` | Server Action, L117; ควรใช้ `app/actions/sla-settings.js` เป็นเส้นทางหลัก |
| หน้า Dashboard | `app/dashboard/page.js` | `DashboardPage()` | Page component, L5 |
| Client หลัก Dashboard | `app/dashboard/DashboardClient.js` | `DashboardClient()` | Client component, L300 |
| Header Dashboard พร้อมลิงก์ approvals/my pending | `components/DashboardHeader.js` | `DashboardHeader()` | Client component, L5 |
| หน้า SLA Report | `app/dashboard/reports/sla/page.js` | `SLAReportPage()` | Page component, L30 |

## shared ui/components

| ชื่อฟังก์ชัน | ไฟล์ | function name จริง | หมายเหตุ |
|---|---|---|---|
| Toggle มุมมอง list/grid | `components/ViewToggle.js` | `ViewToggle()` | Client component, L3; ใช้ร่วมใน checklist และ incident list |

## backup/migration/misc

| ชื่อฟังก์ชัน | ไฟล์ | function name จริง | หมายเหตุ |
|---|---|---|---|
| หน้า Backup | `app/dashboard/backup/page.js` | `BackupPage()` | Page component, L93 |
| Month picker หน้า Backup | `app/dashboard/backup/page.js` | `MonthPicker()` | page-local component, L23 |
| หน้า Migrate | `app/dashboard/migrate/page.js` | `MigratePage()` | Page component, L5 |
| หน้า Test Route | `app/dashboard/test-route/page.js` | `TestPage()` | Page component, L1 |

## scripts/admin-tools

| ชื่อฟังก์ชัน | ไฟล์ | function name จริง | หมายเหตุ |
|---|---|---|---|
| ยกเลิก Checklist เฉพาะเจาะจงโดย Admin | `scripts/cancel_checklist_admin.js` | `cancelChecklist()` | Node.js script รัน standalone; ใช้ Service Role Key; แก้ค่า DOC_NO บรรทัดบน |

## ยังไม่ verified

| ชื่อฟังก์ชัน | ไฟล์ | function name จริง | หมายเหตุ |
|---|---|---|---|
| ไม่มีรายการจาก scope ที่ตรวจ | ยังไม่ verified | ยังไม่ verified | ไม่พบฟังก์ชันที่ต้องเดาจาก scope `app/actions/*` และ `app/dashboard/**/page.js` |
