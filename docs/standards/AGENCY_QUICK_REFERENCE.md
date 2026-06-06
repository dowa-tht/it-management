# ⚡ Agency Quick Reference (Cheat Sheet)

เอกสารฉบับนี้รวบรวม "สูตรสำเร็จ" (Common Patterns) และคำสั่งที่ Agent ต้องใช้บ่อยในการทำงานกับระบบ DOWA IT System

---

## 🔍 1. Database Query Patterns (Supabase Admin)
ใช้สำหรับตรวจสอบข้อมูลเบื้องลึกผ่าน scratch scripts

### **Check Workflow Status of a Document**
```javascript
const { data: approvals } = await supabaseAdmin
  .from('document_approvals')
  .select('id, step_order, status, role_required, approver_id')
  .eq('doc_id', 'YOUR_DOC_ID')
  .order('step_order', { ascending: true })
```

### **Find User by Email (Profiles)**
```javascript
const { data: profile } = await supabaseAdmin
  .from('user_profiles')
  .select('id, full_name, role, is_active')
  .eq('email', 'user@example.com')
  .single()
```

---

## 🛠️ 2. Workflow Troubleshooting
หากพบปัญหา Workflow ไม่ขยับ หรือข้ามขั้นตอน

### **Manual Step Sync**
หาก Reporter เปลี่ยนแปลงหลังสร้างเอกสาร ให้เรียกฟังก์ชันนี้:
```javascript
import { syncDynamicWorkflowApprovers } from '@/app/actions/workflow'
await syncDynamicWorkflowApprovers(docId, 'incident') // หรือ 'checklist'
```

### **Resetting Workflow (Admin only)**
```javascript
import { adminResetWorkflow } from '@/app/actions/workflow'
await adminResetWorkflow(docId, docType, 'ADMIN_PASSWORD')
```

---

## ⏲️ 3. SLA & Business Hours Logic
การคำนวณ SLA ใช้ Net Business Minutes (ห้ามใช้ Diff ของ Date ตรงๆ)

### **Calculate Response/Resolve Time**
```javascript
import { calculateNetBusinessMinutes } from '@/lib/slaUtils'
// Requires: start_time, end_time, working_hours_config, holiday_list
const minutes = calculateNetBusinessMinutes(start, end, wh, holidays)
```

---

## 🎨 4. UI Development Rules (Aggregation)
- **Colors**: ใช้ CSS Variables หรือ Hex ที่ระบุใน `index.css` (ห้าม Hardcode สุ่ม)
- **Loading State**: ทุก Server Action ที่ใช้ใน UI ต้องมี `loading` state และ `disabled` button
- **Error Handling**: ต้องแสดง Alert/Toast ที่อ่านรู้เรื่องเสมอ (ห้ามแสดง JSON Error ให้ User)

---

## 📋 5. Common Table Mappings
| Feature | Table | Log Table |
| :--- | :--- | :--- |
| **Incident** | `incidents` | `incident_logs` |
| **Checklist** | `checklist_docs` | `checklist_logs` |
| **Approvals** | `document_approvals` | `system_audit_logs` |
| **Users** | `user_profiles` | `admin_audit_logs` |

---

## 🧾 6. Audit Log Mapping
- **Document / Settings Audit:** ใช้ `system_audit_logs`
- **User / Security Audit:** ใช้ `admin_audit_logs`
- **Operational Backup Records:** ใช้ `backup_logs`
- **Viewer Contract หลัก:** row สำหรับหน้า Logs กลางควร normalize ให้มี `category`, `docNo/entity_label`, `action`, `details`, `user`, `scope`, `field_changes`
- **Field Changes Contract:** ใช้ `metadata.field_changes = [{ field, old_value, new_value }]` และสำหรับ payload ซับซ้อนให้ใช้ `{ field, summary }`
- **Do Not Log:** `signature_pin`, `otp_code`, `password`, `password_hash`, `signature_data`

---
> [!IMPORTANT]
> **Zero Hack Policy**: ห้ามแก้ไขค่าในตารางโดยไม่ผ่าน Workflow Logic เว้นแต่ได้รับมอบหมายให้ทำ Data Migration
