# 📦 CHANGELOG Archive — 26 พฤษภาคม 2569 (26-May-2026)

## 26 พฤษภาคม 2569 (26-May-2026)
- **16:20 +07:00 | MODULE: Documentation Normalization & Governance Hardening:**
  - ย้าย [`WINDSURF.md`](docs/standards/WINDSURF.md) จาก root ไปยัง [`docs/standards/WINDSURF.md`](docs/standards/WINDSURF.md) เพื่อให้สอดคล้องกับนโยบายรวมศูนย์ markdown ถาวร
  - ย้าย [`ai-tasks/FUNCTION_REGISTRY.md`](docs/standards/FUNCTION_REGISTRY.md) ไปยัง [`docs/standards/FUNCTION_REGISTRY.md`](docs/standards/FUNCTION_REGISTRY.md) และเติมรายการฟังก์ชันส่วนต่างจาก registry เดิมใน [`doc/FUNCTION_REGISTRY.md`](docs/standards/FUNCTION_REGISTRY.md)
  - ย้ายไฟล์แผนจาก [`plans/`](plans) ไปยัง [`docs/history/migration_plan.md`](docs/history/migration_plan.md) และ [`docs/history/procedure-plan-step-fields-implementation-plan.md`](docs/history/procedure-plan-step-fields-implementation-plan.md)
  - ลบโครงสร้างซ้ำซ้อน [`doc/`](doc) หลังตรวจยืนยันว่า registry หลักถูกย้ายและใช้งานจาก [`docs/standards/FUNCTION_REGISTRY.md`](docs/standards/FUNCTION_REGISTRY.md) แล้ว
  - เพิ่มกฎใหม่ใน [`AGENTS.md`](AGENTS.md) สำหรับ `MARKDOWN SINGLE-HOME POLICY` และ `SCRATCH WORKSPACE POLICY`
  - อัปเดต reference paths ใน [`README.md`](README.md), [`docs/INDEX.md`](docs/INDEX.md), [`docs/standards/SUPERPOWERS.md`](docs/standards/SUPERPOWERS.md), และ [`docs/manuals/MULTI_AGENT_WORKFLOW_GUIDE.md`](docs/manuals/MULTI_AGENT_WORKFLOW_GUIDE.md) ให้สอดคล้องกับ path ใหม่

- **22:00 +07:00 | MODULE: Agent Knowledge — WINDSURF.md Skill Document:**
  - สร้างเอกสาร `WINDSURF.md` ที่ root folder บันทึกหลักการคิด วิธีทำงาน และมาตรฐานการตัดสินใจของ Cascade Agent
  - ครอบคลุม 8 ส่วน: Philosophy, Operating Process, Systematic Debugging, Communication Principles, Code Standards, Pre-Delivery Verification, Hard Stop Rules, Mental Model
  - ใช้ตัวอย่างจากเหตุการณ์จริงในโปรเจกต์ (async bug, reported_by_id bug, Login vs Remote Approve)

- **21:55 +07:00 | MODULE: Workflow Engine — cancelDocument Bug Fix:**
  - พบ bug `cancelDocument()` ใน `app/actions/workflow.js` line 1158 ที่ query `reported_by_id` จาก `checklist_docs` ซึ่งไม่มี column นั้น
  - วิธีแก้: ลบ `reported_by_id` ออกจาก select string (ใช้ `*` แทน ซึ่งครอบคลุม field ที่จำเป็นทั้งหมด)
  - สร้าง `scripts/cancel_checklist_admin.js` สำหรับ Admin ยกเลิกเอกสารผ่าน Supabase client (ไม่แตะ DB ตรงๆ)
  - รัน script ยกเลิกเอกสาร `DTT-CHK-2605-006` สำเร็จ พร้อมบันทึก audit log

- **17:35 +07:00 | MODULE: Workflow Approval — Login vs Remote Approve Differentiation:**
  - แก้ `UnifiedApprovalModal`: Login Approve (`isRemote=false`) ไม่แสดง Signature Pad และ PIN field — กด confirm ได้ทันที
  - แก้ `UnifiedApprovalModal`: Remote Approve (`isRemote=true`) ยังคงต้องการ Signature + PIN ของ Approver จริง
  - แก้ `checklist/[id]/page.js`: เพิ่ม `canRemoteApprove` (เฉพาะ Sender = `created_by_id`), แยก Login Modal และ Remote Modal, เพิ่ม `handleRemoteApprove` handler
  - แก้ `incidents/[id]/page.js`: เปลี่ยน `canRemoteApprove` จาก `hasFullAccess` → `currentUser.id === created_by_id` (เฉพาะ Sender), เพิ่ม `isRemoteApprovalMode` state, แยก 2 modal
  - Build ผ่าน, push to `origin/main` commit `4f71ec3`

- **16:05 +07:00 | MODULE: IT Checklist - Detail UI & Final Document Evaluation:**
  - ซ่อนส่วนตารางกรอกข้อมูลของแม่ (ขั้นตอนการดำเนินการ, ผู้รับผิดชอบ, เกณฑ์วัดผลการซ้อม, เวลาดำเนินการ, ผลการประเมิน OK/NG ระดับแม่) สำหรับรายการประเภท Procedure Plan (Type 2) เพื่อไม่ให้แสดงฟิลด์ซ้ำซ้อนกับขั้นตอนย่อย
  - พัฒนาส่วนแสดงผล Final Document Evaluation Card ที่ด้านล่างสุดของรายการตรวจสอบ เมื่อทำรายการย่อยครบ 100%
  - ผูกปุ่มประเมินผลระดับเอกสารภาพรวม (OK/NG) และคำอธิบาย NG ข้อบกพร่อง (evaluation_remark) เข้ากับฐานข้อมูล `checklist_docs`
  - อัปเดตเงื่อนไข `canSubmit` ของ `WorkflowActionBar` ให้ตรวจสอบว่าความคืบหน้าครบ 100% และมีการประเมินผลภาพรวมเสร็จสมบูรณ์แล้ว (ต้องระบุเหตุผลเมื่อเป็น NG) ก่อนที่จะเปิดให้คลิกปุ่มส่งขออนุมัติ
  - รันการทดสอบระบบ `npm test` ผ่าน 100% (12/12 tests passed)
