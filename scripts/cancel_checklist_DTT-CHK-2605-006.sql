-- ============================================================
-- Script: ยกเลิกเอกสาร DTT-CHK-2605-006 โดย Admin Script
-- วันที่: 26 May 2026
-- หมายเหตุ: แก้ bug ที่ cancelDocument() ไม่ทำงานเพราะ
--           query reported_by_id ซึ่งไม่มีใน checklist_docs
-- ============================================================

BEGIN;

-- 1. ตรวจสอบเอกสารก่อน
SELECT id, doc_no, status, workflow_status, created_by_id
FROM checklist_docs
WHERE doc_no = 'DTT-CHK-2605-006';

-- 2. ยกเลิก workflow steps ที่ยังค้างอยู่
UPDATE document_approvals
SET 
  status = 'cancelled',
  action_at = NOW(),
  comment = 'Cancelled by Admin Script'
WHERE 
  doc_id = (SELECT id FROM checklist_docs WHERE doc_no = 'DTT-CHK-2605-006')
  AND status IN ('pending', 'waiting');

-- 3. อัปเดตสถานะเอกสารหลัก
UPDATE checklist_docs
SET
  status      = 'Cancelled',
  workflow_status = NULL,
  assigned_approver_id = NULL,
  cancelled_at  = NOW(),
  cancelled_by  = 'admin@dowa-tht.co.th',
  cancel_reason = 'ยกเลิกโดย Admin Script'
WHERE doc_no = 'DTT-CHK-2605-006'
  AND status NOT IN ('Cancelled', 'Closed');

-- 4. บันทึก audit log
INSERT INTO system_audit_logs (doc_id, doc_type, action, details, performed_by, created_at)
SELECT 
  id,
  'checklist',
  'Cancelled',
  'ยกเลิกโดย Admin Script — เหตุผล: ยกเลิกโดย Admin Script',
  'admin@dowa-tht.co.th',
  NOW()
FROM checklist_docs
WHERE doc_no = 'DTT-CHK-2605-006';

-- 5. ตรวจสอบผลลัพธ์
SELECT id, doc_no, status, workflow_status, cancelled_at, cancelled_by, cancel_reason
FROM checklist_docs
WHERE doc_no = 'DTT-CHK-2605-006';

COMMIT;
