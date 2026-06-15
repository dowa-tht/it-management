BEGIN;

WITH latest_chk AS (
  SELECT doc_no, period_date
  FROM public.checklist_docs
  WHERE doc_no LIKE 'DTT-CHK-%'
  ORDER BY doc_no DESC
  LIMIT 1
)
UPDATE public.no_series AS ns
SET
  last_no_used = latest_chk.doc_no,
  last_date_used = latest_chk.period_date::date
FROM latest_chk
WHERE ns.code = 'CHK';

WITH latest_chk AS (
  SELECT doc_no, period_date
  FROM public.checklist_docs
  WHERE doc_no LIKE 'DTT-CHK-%'
  ORDER BY doc_no DESC
  LIMIT 1
),
active_line AS (
  SELECT id
  FROM public.no_series_lines
  WHERE series_code = 'CHK'
  ORDER BY starting_date DESC
  LIMIT 1
)
UPDATE public.no_series_lines AS nsl
SET
  last_no_used = latest_chk.doc_no,
  last_date_used = latest_chk.period_date
FROM latest_chk, active_line
WHERE nsl.id = active_line.id;

COMMIT;
