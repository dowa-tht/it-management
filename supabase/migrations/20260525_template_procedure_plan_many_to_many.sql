-- Migration: Template-Procedure Plan Many-to-Many Relationship
-- Date: 2026-05-25
-- Description: 
-- 1. Create junction table for many-to-many between checklist_templates and checklist_procedure_plans
-- 2. Allow checklist master to have multiple procedure plans
-- 3. Allow procedure plan to be linked to multiple checklist masters
-- 4. Track which plan was selected when creating a checklist document

begin;

-- ============================================================
-- 1. Create Junction Table: checklist_template_procedure_plans
-- ============================================================
CREATE TABLE IF NOT EXISTS public.checklist_template_procedure_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.checklist_templates(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.checklist_procedure_plans(id) ON DELETE CASCADE,
  is_default BOOLEAN DEFAULT FALSE, -- ถ้ามีหลาย plan อันไหนเป็น default
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(template_id, plan_id)
);

CREATE INDEX IF NOT EXISTS idx_template_procedure_plans_template_id 
  ON public.checklist_template_procedure_plans(template_id);

CREATE INDEX IF NOT EXISTS idx_template_procedure_plans_plan_id 
  ON public.checklist_template_procedure_plans(plan_id);

-- ============================================================
-- 2. Add selected_plan_id to checklist_docs for tracking
-- ============================================================
ALTER TABLE public.checklist_docs
  ADD COLUMN IF NOT EXISTS selected_plan_id UUID REFERENCES public.checklist_procedure_plans(id);

-- ============================================================
-- 3. Enable RLS on new table
-- ============================================================
ALTER TABLE public.checklist_template_procedure_plans ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "admin_all_template_procedure_plans" ON public.checklist_template_procedure_plans;
DROP POLICY IF EXISTS "authenticated_read_template_procedure_plans" ON public.checklist_template_procedure_plans;

-- Admin can do everything
CREATE POLICY "admin_all_template_procedure_plans"
ON public.checklist_template_procedure_plans FOR ALL TO authenticated
USING (public.current_user_is_admin())
WITH CHECK (public.current_user_is_admin());

-- Authenticated users can read for templates they have access to
CREATE POLICY "authenticated_read_template_procedure_plans"
ON public.checklist_template_procedure_plans FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.checklist_templates t
    WHERE t.id = template_id
    AND public.current_user_has_feature_access('checklist', 'RO')
  )
);

-- ============================================================
-- 4. Create function to get available plans for a template
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_template_procedure_plans(p_template_id UUID)
RETURNS TABLE (
  plan_id UUID,
  plan_name TEXT,
  is_default BOOLEAN,
  sort_order INTEGER
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT 
    pp.id as plan_id,
    pp.plan_name,
    tpp.is_default,
    tpp.sort_order
  FROM public.checklist_template_procedure_plans tpp
  JOIN public.checklist_procedure_plans pp ON pp.id = tpp.plan_id
  WHERE tpp.template_id = p_template_id
    AND tpp.is_active = TRUE
  ORDER BY tpp.is_default DESC, tpp.sort_order, pp.plan_name;
$$;

-- ============================================================
-- 5. Migration: Copy existing plan_id from template_config to junction table
-- ============================================================
-- ย้าย plan_id ที่มีอยู่ใน template_config ไปยังตารางใหม่
INSERT INTO public.checklist_template_procedure_plans (template_id, plan_id, is_default, is_active)
SELECT 
  t.id as template_id,
  (t.template_config->>'plan_id')::UUID as plan_id,
  TRUE as is_default,
  TRUE as is_active
FROM public.checklist_templates t
WHERE t.template_config->>'plan_id' IS NOT NULL
  AND t.ui_template_type = '2'  -- T2: Procedure Table
ON CONFLICT (template_id, plan_id) DO NOTHING;

commit;
