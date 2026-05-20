-- 🛡️ [MIGRATION] Add approver_id to workflow_configs to support specific approver selection in UI

ALTER TABLE public.workflow_configs
ADD COLUMN IF NOT EXISTS approver_id UUID REFERENCES auth.users(id);

-- Optional: Create an index for faster lookups
CREATE INDEX IF NOT EXISTS idx_workflow_configs_approver_id ON public.workflow_configs(approver_id);
