-- ============================================================
-- Migration: Fix Incident Reporter Approver Mapping (External Reporter)
-- Date: 2026-05-29
-- Purpose:
--   Clear wrong reporter approver_id on incident workflows where
--   reporter is external (reported_by_id is null).
-- ============================================================

UPDATE public.document_approvals da
SET approver_id = NULL
FROM public.incidents i
WHERE da.doc_type = 'incident'
  AND da.doc_id = i.id
  AND da.role_required = 'reporter'
  AND i.reported_by_id IS NULL
  AND da.approver_id IS NOT NULL;
