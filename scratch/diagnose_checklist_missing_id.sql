-- ============================================================
-- Diagnostic: Find checklist_docs with missing created_by_id
-- รันหลังจาก migration_checklist_created_by_id.sql แล้ว
-- ============================================================

-- ดู record ที่ยังไม่มี created_by_id
SELECT
  c.id,
  c.doc_no,
  c.created_by,
  c.period_date,
  c.freq_type
FROM checklist_docs c
WHERE c.created_by_id IS NULL
ORDER BY c.created_at DESC;

-- ดูว่า created_by นี้มีอยู่ใน user_profiles หรือไม่
SELECT
  c.id AS checklist_id,
  c.created_by AS checklist_created_by,
  up.id AS user_id,
  up.email AS user_email,
  up.full_name AS user_full_name
FROM checklist_docs c
LEFT JOIN user_profiles up ON up.email = c.created_by
WHERE c.created_by_id IS NULL;
