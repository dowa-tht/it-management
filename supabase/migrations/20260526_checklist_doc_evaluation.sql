-- ============================================================
-- Migration: Checklist Document-Level Evaluation
-- Date: 2026-05-26
-- Description: Add overall evaluation fields to checklist_docs
-- ============================================================

ALTER TABLE public.checklist_docs
  ADD COLUMN IF NOT EXISTS evaluation_result TEXT CHECK (evaluation_result IN ('OK', 'NG', null)),
  ADD COLUMN IF NOT EXISTS evaluation_remark TEXT;
