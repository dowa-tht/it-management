-- 1. Add columns to incidents
ALTER TABLE public.incidents 
ADD COLUMN IF NOT EXISTS created_by_id uuid REFERENCES public.user_profiles(id),
ADD COLUMN IF NOT EXISTS created_by text;

-- 2. Backfill existing records using system_audit_logs (preferred) or user_profiles
UPDATE public.incidents AS i
SET 
  created_by_id = COALESCE(
    (
      SELECT p.id 
      FROM public.system_audit_logs l
      JOIN public.user_profiles p ON p.email = l.user_email
      WHERE l.doc_id = i.id AND l.doc_type = 'incident' AND l.action = 'สร้างเคสใหม่'
      ORDER BY l.created_at ASC
      LIMIT 1
    ),
    i.reported_by_id
  ),
  created_by = COALESCE(
    (
      SELECT p.full_name 
      FROM public.system_audit_logs l
      JOIN public.user_profiles p ON p.email = l.user_email
      WHERE l.doc_id = i.id AND l.doc_type = 'incident' AND l.action = 'สร้างเคสใหม่'
      ORDER BY l.created_at ASC
      LIMIT 1
    ),
    (
      SELECT p.full_name 
      FROM public.user_profiles p 
      WHERE p.id = i.reported_by_id
      LIMIT 1
    ),
    i.reported_by
  )
WHERE i.created_by_id IS NULL;
