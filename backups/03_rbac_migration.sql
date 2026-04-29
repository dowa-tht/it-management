-- ============================================================
-- RBAC SQL MIGRATION — Phase 2
-- Date: 2026-04-29
-- รันใน Supabase Dashboard → SQL Editor
-- รันทีละ Block (คั่นด้วย ---) เพื่อความปลอดภัย
-- ============================================================

-- ============================================================
-- BLOCK 1: สร้างตาราง external_users (Tier 2 Identity)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.external_users (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email                TEXT NOT NULL UNIQUE,
  full_name            TEXT NOT NULL,
  role                 TEXT NOT NULL CHECK (role IN ('approval', 'guest')),

  -- Access Control
  access_token         TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  access_duration_days INTEGER DEFAULT 7,
  expires_at           TIMESTAMPTZ,
  is_active            BOOLEAN DEFAULT true,

  -- PIN (optional)
  pin_hash             TEXT,
  pin_reset_token      TEXT,
  pin_reset_expires    TIMESTAMPTZ,

  -- Audit
  created_by           UUID REFERENCES auth.users(id),
  created_at           TIMESTAMPTZ DEFAULT now(),
  last_accessed_at     TIMESTAMPTZ,
  disabled_at          TIMESTAMPTZ,
  notes                TEXT
);

-- ตรวจสอบ: SELECT * FROM external_users LIMIT 1;

-- ============================================================
-- BLOCK 2: สร้างตาราง approval_tokens
-- ============================================================
CREATE TABLE IF NOT EXISTS public.approval_tokens (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id      UUID NOT NULL,
  document_type    TEXT NOT NULL CHECK (document_type IN (
                     'incident_report', 'backup_report',
                     'it_checklist', 'general'
                   )),
  document_title   TEXT,
  token            TEXT NOT NULL UNIQUE
                     DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at       TIMESTAMPTZ NOT NULL
                     DEFAULT (now() + INTERVAL '7 days'),
  used_at          TIMESTAMPTZ,
  approver_email   TEXT NOT NULL,
  approver_name    TEXT,
  external_user_id UUID REFERENCES external_users(id),
  action           TEXT CHECK (action IN ('approved','rejected','pending'))
                     DEFAULT 'pending',
  comment          TEXT,
  approved_at      TIMESTAMPTZ,
  created_by       UUID REFERENCES auth.users(id),
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- BLOCK 3: สร้างตาราง user_registry (Bridge Table)
-- หมายเหตุ: ใช้ user_role แทน current_role เพราะ current_role
--           เป็น Reserved Keyword ใน PostgreSQL
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_registry (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email                 TEXT NOT NULL UNIQUE,
  full_name             TEXT NOT NULL,
  user_role             TEXT NOT NULL CHECK (user_role IN (
                          'administrator','supervisor','approval','guest'
                        )),
  supabase_user_id      UUID,
  external_user_id      UUID,
  is_active             BOOLEAN DEFAULT true,
  last_role_changed_at  TIMESTAMPTZ,
  last_role_changed_by  UUID,
  created_by            UUID,
  created_at            TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- BLOCK 4: สร้างตาราง user_limits
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_limits (
  id            SERIAL PRIMARY KEY,
  max_total     INTEGER DEFAULT 50,
  max_per_day   INTEGER DEFAULT 5,
  max_per_month INTEGER DEFAULT 10,
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- Insert ค่าเริ่มต้น (ทำแค่ครั้งเดียว)
INSERT INTO public.user_limits (max_total, max_per_day, max_per_month)
SELECT 50, 5, 10
WHERE NOT EXISTS (SELECT 1 FROM public.user_limits);

-- ============================================================
-- BLOCK 5: เพิ่ม Columns ใน user_profiles
-- ============================================================
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS pin_hash          TEXT,
  ADD COLUMN IF NOT EXISTS pin_reset_token   TEXT,
  ADD COLUMN IF NOT EXISTS pin_reset_expires TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS department        TEXT,
  ADD COLUMN IF NOT EXISTS employee_id       TEXT;

-- ============================================================
-- BLOCK 6: Seed user_registry จาก user_profiles ที่มีอยู่
-- (ทำให้ 3 users เดิมอยู่ใน Bridge Table ด้วย)
-- ============================================================
INSERT INTO public.user_registry (email, full_name, user_role, supabase_user_id, is_active)
SELECT 
  au.email,
  up.full_name,
  CASE up.role 
    WHEN 'superuser' THEN 'administrator'
    WHEN 'user'      THEN 'supervisor'
    WHEN 'visitor'   THEN 'guest'
    ELSE up.role
  END AS user_role,
  up.id AS supabase_user_id,
  up.is_active
FROM public.user_profiles up
JOIN auth.users au ON au.id = up.id
ON CONFLICT (email) DO NOTHING;

-- ============================================================
-- BLOCK 7: ตรวจสอบผลลัพธ์ทั้งหมด
-- ============================================================
SELECT 'external_users'  AS table_name, COUNT(*) FROM public.external_users
UNION ALL
SELECT 'approval_tokens',               COUNT(*) FROM public.approval_tokens
UNION ALL
SELECT 'user_registry',                 COUNT(*) FROM public.user_registry
UNION ALL
SELECT 'user_limits',                   COUNT(*) FROM public.user_limits
UNION ALL
SELECT 'user_profiles (with new cols)', COUNT(*) FROM public.user_profiles
ORDER BY table_name;
