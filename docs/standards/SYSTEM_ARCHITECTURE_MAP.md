# 🗺️ System Architecture Map (Unified Version)

เอกสารฉบับนี้เป็น Aggregation Tool สำหรับ Agent เพื่อทำความเข้าใจโครงสร้างทางเทคนิคและ Logic Flow ของระบบทั้งหมดในที่เดียว

---

## 🏗️ 1. Core Architecture Pattern
- **Framework**: Next.js (App Router)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth + `user_profiles` (Source of Truth)
- **Logic**: Server Actions (`app/actions/`)
- **UI Architecture**: Component-based with Centralized State for Workflows

---

## 🧠 2. Unified Workflow Engine
ระบบกลางที่จัดการลำดับการอนุมัติ (Approval Sequence) ของทุกโมดูล

### **Key Components**
- **Table**: `document_approvals` (Transactional tracking)
- **Logic Handler**: `app/actions/workflow.js`
- **Registry**: `lib/workflowRegistry.js` (Mapping types to tables)
- **UI**: `components/workflow/UnifiedApprovalModal.js`

### **Workflow Lifecycle**
1. **Submit**: `submitRequest` (in module actions) calls `generateWorkflowSteps`.
2. **Pending**: `getUnifiedPendingApprovals` lists tasks for approvers.
3. **Approve**: `submitApprovalStep` handles logic, PIN verification, and signature recording.
4. **Finalize**: `onDocumentFinalApproval` triggers cross-module actions (e.g., Incident -> Checklist sync).

---

## 🆘 3. Incident Management Module
ระบบจัดการปัญหาไอทีแบบ End-to-End

### **Key Components**
- **Table**: `incidents`
- **Logs**: `incident_logs` & `system_audit_logs`
- **Logic Handler**: `app/actions/incidents.js`
- **SLA Engine**: `lib/slaUtils.js` (Business minutes calculation)

### **State Flow**
- **Open**: เคสใหม่ รอ IT รับเรื่อง
- **In Progress**: IT รับเรื่องแล้ว (Accept/Dispatch)
- **Pending Approval**: แก้ไขปัญหาแล้ว รอผู้อนุมัติตรวจสอบ
- **Closed**: จบงาน (SLA Stops)

---

## 📋 4. IT Checklist Engine
ระบบตรวจสอบความพร้อมประจำวัน/สัปดาห์/เดือน/ปี

### **Key Components**
- **Tables**: `checklist_docs`, `checklist_items`, `checklist_templates`
- **Logic Handler**: `app/actions/dashboard.js` (Aggregation) & `lib/checklistItems.js`
- **Workflow**: ผูกกับ Workflow Engine โดยระบุ `freq_type` เป็นเงื่อนไข

---

## 👥 5. Identity & Security (The Unified Identity)
ระบบจัดการบัญชีและสิทธิ์เข้าถึงแบบรวมศูนย์

### **Key Components**
- **Table**: `user_profiles` (Primary source for roles/PINs)
- **Whitelist**: `user_whitelist` (Double-lock security)
- **Auth Strategy**: Microsoft 365 SSO + Local Password + 6-digit PIN
- **Roles (RBAC)**: `admin`, `it_staff`, `approver`, `employee`, `auditor`

### **Security Features**
- **PIN Verification**: ใช้ Bcrypt ในการ Hash และตรวจสอบ PIN 6 หลัก
- **Lockout System**: ป้องกัน Brute Force (5 attempts -> Lock 30 mins)
- **Remote Approval**: อนุญาตให้ Admin/IT เซ็นแทนได้หากมี PIN ของผู้อนุมัติจริง

---

## 📊 6. Global Dashboard & Reporting
ระบบรวบรวมข้อมูลสถิติและ KPI

### **Key Components**
- **Logic**: `getDashboardData` (Aggregates stats from all tables)
- **SLA Calculation**: คำนวณรายเคสแบบ Real-time ตามวันหยุดและเวลาทำการบริษัท
- **Global Header**: `DashboardHeader.js` แสดงผลจำนวนงานค้างรวมของทั้งระบบ

---

## 🛠️ 7. Maintenance & Audit Tools
- **Audit Logs**: `system_audit_logs` บันทึกทุกความเคลื่อนไหวสำคัญ
- **No Series**: `lib/noSeries.js` จัดการเลขที่เอกสารแบบ Thread-safe
- **Migration Helpers**: ฟังก์ชันใน `workflow.js` สำหรับปรับปรุงโครงสร้างข้อมูลเก่า

---
> [!TIP]
> **Agent Usage**: ใช้ไฟล์นี้ร่วมกับ `grep_search` เพื่อหาไฟล์ Logic ที่เกี่ยวข้องตามชื่อโมดูลที่ระบุข้างต้น
