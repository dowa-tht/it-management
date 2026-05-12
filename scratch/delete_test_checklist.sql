-- ============================================================
-- Cleanup: Delete test checklist record with invalid created_by
-- Date: 2026-05-11
-- Reason: Record created_by='exam@123.com' has no matching user_profiles
-- ============================================================

-- Step 1: Delete child items first (FK constraint)
DELETE FROM checklist_items
WHERE doc_id = '25e25db6-6e8a-49db-82f3-2a05e32eebbb';

-- Step 2: Delete the parent doc
DELETE FROM checklist_docs
WHERE id = '25e25db6-6e8a-49db-82f3-2a05e32eebbb';

-- Step 3: Verify no more missing created_by_id
SELECT
  COUNT(*) AS total_checklists,
  COUNT(created_by_id) AS with_id,
  COUNT(*) - COUNT(created_by_id) AS still_missing_id
FROM checklist_docs;
