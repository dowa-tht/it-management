# [PLAN] แผนการปรับปรุง Dashboard และ Incident Workflow (Phase 3)

**วันที่จัดทำ:** 11-May-2026
**สถานะ:** 📝 วางแผน (Planning)
**วัตถุประสงค์:** เพื่อแก้ไขปัญหาการแสดงผล Dashboard, ปิดช่องโหว่การแก้ไขเอกสารของ Employee, แก้บั๊ก Approvals ไม่แสดงผล, และเพิ่มฟังก์ชัน Remote Approval ตามคำขอของ USER

---

## 1. ปรับลำดับกล่องแสดงผล Dashboard
**ไฟล์ที่แก้ไข:** `app/dashboard/page.js`
**รายละเอียดเชิงเทคนิค:**
- แก้ไข Array `statCards` (ประมาณบรรทัดที่ 351) โดยจัดลำดับ Object ใหม่ให้เป็น:
  1. Checklist NG
  2. Incident 30 วัน
  3. High Severity
  4. รอรับเรื่อง (Open)
  5. กำลังแก้ไข (In Progress)
  6. รออนุมัติ (Pending)

---

## 2. Access Control & Security (ปิดช่องโหว่ Employee แก้ไขงาน)
**เป้าหมาย:** เมื่อสถานะเปลี่ยนจาก Open เป็น In Progress ผู้แจ้ง (Employee) ต้องไม่สามารถแก้ไขรายละเอียดได้
**ไฟล์ที่แก้ไข:** `app/dashboard/incidents/[id]/page.js` และ `components/workflow/WorkflowActionBar.js`
**รายละเอียดเชิงเทคนิค:**
- **วิเคราะห์:** ในหน้า `[id]/page.js` ตัวแปร `canEditDetails` ถูกคำนวณถูกต้องแล้ว (เป็น `false` สำหรับ Employee เมื่อสถานะไม่ใช่ Open) แต่ปุ่ม "แก้ไข" ใน `<WorkflowActionBar>` แสดงผลเพียงแค่เช็คเงื่อนไข `isDraft` โดยไม่ได้นำ `canEditDetails` มาควบคุม
- **วิธีแก้:**
  1. เพิ่ม Prop `canEdit={canEditDetails}` เข้าไปใน Component `<WorkflowActionBar>`
  2. ในไฟล์ `WorkflowActionBar.js` นำ Prop `canEdit` ไปครอบปุ่ม "✏️ แก้ไข" เพื่อให้ปุ่มหายไปหากไม่มีสิทธิ์

---

## 3. ตรวจสอบบั๊กเอกสารไม่แสดงในกล่อง Approvals
**เป้าหมาย:** เอกสารที่ส่งหาผู้อนุมัติเจาะจงต้องแสดงในหน้า Dashboard ของผู้อนุมัตินั้นๆ
**ไฟล์ที่เกี่ยวข้อง:** `app/actions/workflow.js` (ฟังก์ชัน `getUnifiedPendingApprovals`) และ ข้อมูลใน Database
**รายละเอียดเชิงเทคนิค:**
- **วิเคราะห์:** Query ปัจจุบันดึงข้อมูลด้วยเงื่อนไข `approver_id.eq.${profile.id}` (ซึ่งคาดหวังว่าเป็น **UUID**) แต่สาเหตุที่ระบบไม่แสดงเอกสาร DTT-INC-2605-010 ให้ `test_admin@dowa.local` เห็น มักเกิดจากตอนที่ IT กด Assign หรือ Submit ระบบอาจเผลอบันทึกค่าเป็น "Email" (String) ลงในคอลัมน์ `approver_id` ของตาราง `document_approvals` หรือ `approval_configs` แทนที่จะเป็น UUID ของ User Profile
- **วิธีแก้:**
  1. ใช้ Scratch script ดึงค่า `approver_id` ของเอกสาร DTT-INC-2605-010 มาตรวจสอบ (Data Type Mismatch)
  2. หากเป็น Email จริง ต้องแก้ไขข้อมูลใน DB กลับเป็น UUID 
  3. ตรวจสอบและอุดช่องโหว่ในฟังก์ชันที่บันทึก `approver_id` (เช่นใน `submitApprovalStep` หรือหน้า Config) ให้ดึง ID จากตาราง `user_profiles` เสมอ

---

## 4. เพิ่มฟังก์ชัน Remote Approval สำหรับ Admin และ IT
**เป้าหมาย:** ให้ Admin หรือ IT สามารถนำอุปกรณ์ของตนเดินไปให้ Requester กรอก PIN อนุมัติได้ (โดยไม่ต้องให้ Requester Login เครื่องตัวเอง)
**ไฟล์ที่แก้ไข:** `app/dashboard/incidents/[id]/page.js` และ `components/workflow/WorkflowActionBar.js`
**รายละเอียดเชิงเทคนิค:**
- **วิเคราะห์:** ปัจจุบันระบบ Back-end รองรับ Remote Approval อยู่แล้วผ่านพารามิเตอร์ `overrideApproverId` และการเช็ค PIN แต่ฝั่งหน้าจอ (UI) ซ่อนปุ่มอนุมัติไว้ถ้า User ที่ Login ไม่ใช่ Approver ตัวจริง
- **วิธีแก้:**
  1. ในหน้า Detail สร้างตัวแปรใหม่: `const canRemoteApprove = hasFullAccess && incident.status === 'Pending Approval' && !canApprove;`
  2. ส่ง `canRemoteApprove` ให้ `<WorkflowActionBar>`
  3. ใน `WorkflowActionBar.js` เพิ่มปุ่ม "🔏 อนุมัติแทน (Remote)" สีม่วงหรือสีเทาเข้ม
  4. เมื่อกดปุ่ม ให้แสดง `<UnifiedApprovalModal>` (หน้าต่างใส่รหัส PIN) 
  5. ปรับ `handleApprove` ให้รับรู้ว่าเป็น Remote Approval และเรียก `submitApprovalStep` โดยส่ง `overrideApproverId = currentStep.approver_id` เข้าไปด้วย (เพื่อบันทึกว่า ใครคือเจ้าของลายเซ็น และใครคือคนกด Remote)
