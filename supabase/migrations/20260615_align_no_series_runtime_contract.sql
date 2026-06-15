BEGIN;

ALTER TABLE public.no_series
  ADD COLUMN IF NOT EXISTS format text,
  ADD COLUMN IF NOT EXISTS linked_form text DEFAULT 'ไม่ผูกกับเอกสาร',
  ADD COLUMN IF NOT EXISTS manual_nos boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_no_used text,
  ADD COLUMN IF NOT EXISTS last_date_used date;

ALTER TABLE public.no_series_lines
  ADD COLUMN IF NOT EXISTS starting_no text,
  ADD COLUMN IF NOT EXISTS is_open boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS last_date_used timestamptz;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'no_series_lines'
      AND column_name = 'last_no_used'
      AND data_type <> 'text'
  ) THEN
    ALTER TABLE public.no_series_lines
      ALTER COLUMN last_no_used TYPE text USING last_no_used::text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'no_series_lines_series_code_fkey'
  ) THEN
    ALTER TABLE public.no_series_lines
      ADD CONSTRAINT no_series_lines_series_code_fkey
      FOREIGN KEY (series_code)
      REFERENCES public.no_series(code)
      ON UPDATE CASCADE
      ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_no_series_lines_series_code_starting_date
  ON public.no_series_lines(series_code, starting_date DESC);

COMMIT;
