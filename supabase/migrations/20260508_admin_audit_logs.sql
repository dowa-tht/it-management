-- Create admin_audit_logs table
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES auth.users(id),
    admin_email TEXT,
    target_user_id UUID,
    action TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can read audit logs
CREATE POLICY "Admins can view all audit logs" ON public.admin_audit_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Policy: System/Admin can insert audit logs
CREATE POLICY "System can insert audit logs" ON public.admin_audit_logs
    FOR INSERT
    WITH CHECK (true); -- Usually inserted via Service Role / Server Actions

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin_id ON public.admin_audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_target_user_id ON public.admin_audit_logs(target_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON public.admin_audit_logs(created_at);

-- Add lockout columns to external_users if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='external_users' AND column_name='pin_attempts') THEN
        ALTER TABLE public.external_users ADD COLUMN pin_attempts INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='external_users' AND column_name='pin_locked_until') THEN
        ALTER TABLE public.external_users ADD COLUMN pin_locked_until TIMESTAMPTZ;
    END IF;
END $$;
