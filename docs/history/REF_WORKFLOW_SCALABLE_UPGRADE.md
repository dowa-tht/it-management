# 📑 Technical Reference: Scalable Workflow Engine Upgrade

**Version**: 1.0 (2026-05-09)  
**Status**: Plan for Implementation  
**Ref**: Unified Workflow Engine (Scalability & ERP-like Flexibility)

---

## 🎯 Goal
ยกระดับระบบ Workflow จากเดิมที่เป็นแบบ Hardcoded ให้กลายเป็นระบบ **Registry-based** ที่รองรับเอกสารทุกประเภทในอนาคต (เช่น IT Request, Report) และใช้ระบบการกรองแบบ **Integer-based** เพื่อความเสถียรสูงสุด

---

## 🏛️ Architecture & Registry Design

### 1. Document Registry Pattern
เราจะใช้การจดทะเบียนเอกสาร (Registry) แทนการเขียน `if-else` แยกตามตาราง:

```javascript
const WORKFLOW_DOC_REGISTRY = {
  incident: {
    table: 'incidents',
    condition_key: 'severity', // กรองตามความรุนแรง
    no_field: 'case_number',
    title_field: 'title'
  },
  checklist: {
    table: 'checklist_docs',
    condition_key: 'freq_type', // กรองตามความถี่
    no_field: 'id',
    title_field: 'freq_type'
  }
}
```

### 2. Integer-based Routing
เปลี่ยนค่าเงื่อนไขจาก String เป็น Integer เพื่อความแม่นยำ (Normalized Mapping):
*   **Incident Severity**: `Low=0`, `Medium=1`, `High=2`
*   **Checklist Frequency**: `Daily=0`, `Weekly=1`, `Monthly=2`, `Yearly=3`

---

## 🚀 Key Implementation Steps

### 1. Backend (Server Actions - `workflow.js`)
*   **Dynamic Submit**: ปรับปรุงฟังก์ชัน `submitRequest` ให้ดึงข้อมูลจาก Registry เพื่อ Update ตารางที่เกี่ยวข้องโดยอัตโนมัติ
*   **Auto-Approve Engine**: ปรับปรุงฟังก์ชัน `applySignaturesToWorkflow` ให้รองรับการใส่ลายเซ็นหลายคนพร้อมกันตอนส่งงาน (Resolve)

### 2. Frontend (Incident Detail - `[id]/page.js`)
*   **Consolidated Resolve Dialog**: เพิ่มหน้าต่างเก็บลายเซ็น 2 ฝ่าย (IT Officer + Requester) พร้อมการตรวจสอบ PIN ของผู้แจ้งในขั้นตอนเดียว
*   **Workflow Progress UI**: ปรับปรุงแถบสถานะให้รองรับการ Preview ขั้นตอนการอนุมัติล่วงหน้า แม้จะยังไม่ได้ส่งขออนุมัติ
*   **SLA Compliance Fix**: แก้ไขตัวเลขเป้าหมาย SLA ให้ตรงตามมาตรฐาน (Low Response: 6 ชม. / Resolution: 3 วันทำการ)

---

## ✅ Verification Criteria
1.  **Low Incident**: เมื่อ IT กด Resolve และเซ็นชื่อครบ 2 คน -> เคสต้องเปลี่ยนเป็น `Closed` ทันที
2.  **High Incident**: เมื่อ IT กด Resolve และเซ็นชื่อครบ 2 คน -> เคสต้องเปลี่ยนเป็น `Pending Approval` เพื่อรอ Manager
3.  **Extensibility**: เมื่อเพิ่มตารางเอกสารใหม่ในอนาคต ต้องสามารถใช้งาน Workflow ได้เพียงแค่เพิ่มชื่อตารางใน Registry

---
*จัดทำแผนงานโดย: AI Agent (Antigravity)*
