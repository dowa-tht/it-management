-- ============================================================
-- Migration: Add created_by_id column to checklist_docs table
-- Date: 2026-05-11
-- Reason: Per REF_DASHBOARD_HEADER.md — My Sent Pending must use UUID
--         for reliable identity lookup instead of email/string matching
-- ============================================================

-- Step 1: Add the column (nullable to support existing records)
ALTER TABLE checklist_docs
  ADD COLUMN IF NOT EXISTS created_by_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL;

-- Step 2: Backfill existing records where created_by matches an email in user_profiles
UPDATE checklist_docs c
SET created_by_id = up.id
FROM user_profiles up
WHERE c.created_by_id IS NULL
  AND up.email = c.created_by;

-- Step 3: Verify results
SELECT
  COUNT(*) AS total_checklists,
  COUNT(created_by_id) AS with_id,
  COUNT(*) - COUNT(created_by_id) AS still_missing_id
FROM checklist_docs;
