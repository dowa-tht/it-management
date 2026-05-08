-- ============================================================
-- Migration: Add reported_by_id column to incidents table
-- Date: 2026-05-07
-- Reason: Per DEVELOPMENT.md §6 (Reporter ID Storage)
--         UUID must be stored for reliable identity lookup
--         during PIN verification in the Resolve workflow.
-- ============================================================

-- Step 1: Add the column (nullable to support existing records)
ALTER TABLE incidents
  ADD COLUMN IF NOT EXISTS reported_by_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL;

-- Step 2: Backfill existing records where reported_by matches a full_name in user_profiles
--         This is a one-time operation to fix historical data.
UPDATE incidents i
SET reported_by_id = up.id
FROM user_profiles up
WHERE i.reported_by_id IS NULL
  AND (
    up.full_name = i.reported_by   -- match by display name
    OR up.email = i.reported_by    -- match by email (if stored as email)
  );

-- Step 3: Verify results
SELECT
  COUNT(*) AS total_incidents,
  COUNT(reported_by_id) AS with_id,
  COUNT(*) - COUNT(reported_by_id) AS still_missing_id
FROM incidents;
