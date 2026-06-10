-- Migration to add metadata column to public.login_logs and restore missing login records
-- Date: 2026-06-10

-- 1. Add metadata column to login_logs if it doesn't already exist
ALTER TABLE public.login_logs 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- 2. Retroactively restore missing login records from auth.audit_log_entries
INSERT INTO public.login_logs (user_id, user_email, action, ip_address, user_agent, created_at)
SELECT 
  (payload->>'actor_id')::uuid AS user_id,
  payload->>'actor_username' AS user_email,
  'login' AS action,
  'SERVER_SIDE' AS ip_address,
  'Restored from Auth Audit Log' AS user_agent,
  created_at
FROM auth.audit_log_entries
WHERE 
  payload->>'action' = 'login'
  -- เช็คว่า user_id ยังคงมีอยู่ในตาราง auth.users เพื่อป้องกัน Foreign Key Error
  AND EXISTS (
    SELECT 1 FROM auth.users u WHERE u.id = (payload->>'actor_id')::uuid
  )
  AND NOT EXISTS (
    SELECT 1 
    FROM public.login_logs existing
    WHERE existing.user_id = (payload->>'actor_id')::uuid
      AND existing.action = 'login'
      AND ABS(EXTRACT(EPOCH FROM (existing.created_at - audit_log_entries.created_at))) < 2
  );
