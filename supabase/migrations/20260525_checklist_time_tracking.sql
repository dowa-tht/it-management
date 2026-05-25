-- ============================================================
-- Migration: Checklist Time Tracking & Evaluation Support
-- Date: 2026-05-25
-- Description: Add time tracking and evaluation fields to checklist tables
-- ============================================================

-- Add columns to checklist_items for time tracking and evaluation
ALTER TABLE public.checklist_items
  ADD COLUMN IF NOT EXISTS duration_minutes INTEGER, -- Duration in minutes (HH:mm converted)
  ADD COLUMN IF NOT EXISTS evaluation_result TEXT CHECK (evaluation_result IN ('OK', 'NG', null)),
  ADD COLUMN IF NOT EXISTS responsible_person TEXT, -- Person assigned to this step
  ADD COLUMN IF NOT EXISTS evaluation_criteria TEXT; -- Criteria for evaluation

-- Add columns to checklist_docs for time tracking at document level
ALTER TABLE public.checklist_docs
  ADD COLUMN IF NOT EXISTS start_time TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS actual_end_time TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS total_duration_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS calculated_end_time TIMESTAMPTZ; -- Start time + sum of all item durations

-- Add index for time-based queries
CREATE INDEX IF NOT EXISTS idx_checklist_docs_start_time ON public.checklist_docs(start_time) WHERE start_time IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_checklist_items_duration ON public.checklist_items(doc_id, duration_minutes) WHERE duration_minutes IS NOT NULL;

-- Update RLS policies if needed (columns are nullable for backward compatibility)
-- Note: Existing data will have NULL values (expected behavior)

-- ============================================================
-- Note: UI must handle NULL values gracefully for backward compatibility
-- ============================================================
