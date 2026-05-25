-- ============================================================
-- Migration: Cancel Document Support
-- Date: 2026-05-25
-- Description: Add cancellation tracking columns to checklist_docs and incidents
-- ============================================================

-- Add cancellation columns to checklist_docs
ALTER TABLE public.checklist_docs
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_by TEXT,
  ADD COLUMN IF NOT EXISTS cancel_reason TEXT;

-- Add cancellation columns to incidents
ALTER TABLE public.incidents
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_by TEXT,
  ADD COLUMN IF NOT EXISTS cancel_reason TEXT;

-- Update document_approvals table to allow 'cancelled' status
-- Note: The status column should already allow 'cancelled' via CHECK constraint
-- If not, we need to modify the constraint (handled by workflow engine)

-- Add index for cancelled documents queries
CREATE INDEX IF NOT EXISTS idx_checklist_docs_cancelled_at ON public.checklist_docs(cancelled_at) WHERE cancelled_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_incidents_cancelled_at ON public.incidents(cancelled_at) WHERE cancelled_at IS NOT NULL;

-- Update RLS policies to allow admin/creator to update cancelled status
-- (This will be handled by the application layer via Server Actions)

-- ============================================================
-- Note: Status 'Cancelled' is handled at application level
-- The workflow engine now supports 'cancelled' status in document_approvals
-- ============================================================
