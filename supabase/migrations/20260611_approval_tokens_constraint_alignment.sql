BEGIN;

ALTER TABLE public.approval_tokens
  DROP CONSTRAINT IF EXISTS approval_tokens_document_type_check;

ALTER TABLE public.approval_tokens
  ADD CONSTRAINT approval_tokens_document_type_check
  CHECK (
    document_type = ANY (
      ARRAY[
        'incident'::text,
        'checklist'::text,
        'incident_report'::text,
        'backup_report'::text,
        'it_checklist'::text,
        'general'::text
      ]
    )
  );

COMMIT;
