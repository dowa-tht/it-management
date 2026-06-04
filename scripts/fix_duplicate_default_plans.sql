-- Fix duplicate default plans in checklist_template_procedure_plans
-- This script ensures only one plan per template has is_default = true

BEGIN;

-- First, set all is_default to false for all templates
UPDATE public.checklist_template_procedure_plans 
SET is_default = false 
WHERE is_active = true;

-- Then, set the first plan (lowest sort_order) as default for each template
UPDATE public.checklist_template_procedure_plans t1
SET is_default = true
FROM (
    SELECT 
        template_id, 
        plan_id,
        ROW_NUMBER() OVER (PARTITION BY template_id ORDER BY sort_order ASC, plan_id ASC) as rn
    FROM public.checklist_template_procedure_plans 
    WHERE is_active = true
) t2
WHERE t1.plan_id = t2.plan_id 
  AND t2.rn = 1;

-- Verify the fix
SELECT 
    template_id,
    COUNT(*) as total_plans,
    COUNT(*) FILTER (WHERE is_default = true) as default_plans
FROM public.checklist_template_procedure_plans 
WHERE is_active = true
GROUP BY template_id
HAVING COUNT(*) FILTER (WHERE is_default = true) > 1;

COMMIT;
