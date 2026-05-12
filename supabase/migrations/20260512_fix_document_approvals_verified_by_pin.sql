-- Fix: document_approvals.verified_by_pin missing in live database
-- Date: 12-May-2026
-- Context: handle_approval_step() writes verified_by_pin for Remote Approval audit evidence.

ALTER TABLE public.document_approvals
    ADD COLUMN IF NOT EXISTS verified_by_pin BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN public.document_approvals.verified_by_pin IS
    'True when an approval step was verified by approver PIN, typically for Remote Approval audit evidence.';
