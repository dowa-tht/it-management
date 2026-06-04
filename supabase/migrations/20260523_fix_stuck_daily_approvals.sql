-- Fix stuck daily checklist approvals in document_approvals table
UPDATE public.document_approvals
SET status = 'approved', action_at = NOW()
WHERE doc_id IN (
  '2242f050-3c2a-4cab-8119-19c2404c7e98', -- DTT-CHK-2605-007 (2026-05-05)
  '09e2f27a-66b6-46fd-9263-06d6c860f981', -- DTT-CHK-2605-008 (2026-05-06)
  'b2fb99af-d302-4d7a-b5d6-59d47ad58c34'  -- DTT-CHK-2605-009 (2026-05-07)
)
  AND status = 'pending';
