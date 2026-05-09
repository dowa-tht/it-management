# แผนการอัปเกรด UI/UX: Premium Workflow Cards (Phase 3)

**วันที่จัดทำ**: 08-May-2026
**สถานะ**: รอดำเนินการ (Pending Approval)
**เป้าหมาย**: ปรับปรุงการแสดงผลรายการ Incident และ Checklist ให้เป็นรูปแบบ Card ที่ทันสมัยและรองรับการติดตาม Workflow ได้ทันที

---

## 🛠️ รายการดำเนินการ (Task List)

### 1. พัฒนาคอมโพเนนต์พื้นฐาน (Core Components)
- [ ] **WorkflowMiniProgress**: คอมโพเนนต์แสดงสถานะลำดับขั้น (Step Segments) สำหรับใช้บนการ์ด
    - สีเขียว: อนุมัติแล้ว
    - สีน้ำเงิน (Pulse): กำลังรอดำเนินการ
    - สีเทา: ยังไม่ถึงขั้นตอน
- [ ] **ViewToggle**: ปุ่มสำหรับสลับมุมมองระหว่าง Table และ Card View

### 2. อัปเกรดหน้า Incident Management
- [ ] สร้างคอมโพเนนต์ `IncidentCard` ตามมาตรฐาน UI_UX_SETTING (Radius 20px, Soft Shadow)
- [ ] ปรับปรุงหน้า `app/dashboard/incidents/page.js` ให้รองรับการสลับ View Mode
- [ ] เพิ่มการแสดงผล Step ปัจจุบันบนการ์ด (เช่น "Step 2: IT Manager Approval")

### 3. อัปเกรดหน้า IT Checklist
- [ ] สร้างคอมโพเนนต์ `ChecklistCard` พร้อมระบบ Circular Progress (% Completion)
- [ ] เพิ่ม Badge แจ้งเตือนรายการ NG (ปัญหาที่พบ) ให้โดดเด่นบนการ์ด
- [ ] ปรับปรุงหน้า `app/dashboard/checklist/page.js` ให้รองรับ Card Grid

---

## 🎨 มาตรฐานการออกแบบ (Design Specs)

### Incident Card
- **Top Right**: Severity Badge (Glow Effect)
- **Center**: Title (Truncate 2 lines) + Affected System (Subtext)
- **Workflow**: Mini Progress Bar + Current Role Label
- **Bottom**: User Info + Date

### Checklist Card
- **Left/Center**: Circular Progress (80% Done)
- **Top Right**: NG Count Badge (ถ้ามี)
- **Bottom**: Workflow Status Badge (Pending/Approved)

---

## 🛡️ การตรวจสอบ (Verification)
- ทดสอบความลื่นไหลของการสลับ View
- ตรวจสอบความถูกต้องของ Step ที่แสดงบนการ์ดเทียบกับ `document_approvals`
- ตรวจสอบ Responsive Design (Mobile View ต้องดูง่าย)

---
*จัดทำแผนโดย AI Agent (Antigravity)*
