-- 📘 Workflow Refinement Phase 2: Centralized Logs & Transactions
-- Date: 08-May-2026

-- 1. Create system_audit_logs table
CREATE TABLE IF NOT EXISTS public.system_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doc_id UUID NOT NULL,
    doc_type TEXT NOT NULL, -- 'incident' | 'checklist' | 'user' | etc.
    action TEXT NOT NULL,
    details TEXT,
    user_email TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.system_audit_logs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Everyone authenticated can read audit logs" ON public.system_audit_logs
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Service role can insert audit logs" ON public.system_audit_logs
    FOR INSERT WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_system_audit_logs_doc_id ON public.system_audit_logs(doc_id);
CREATE INDEX IF NOT EXISTS idx_system_audit_logs_doc_type ON public.system_audit_logs(doc_type);
CREATE INDEX IF NOT EXISTS idx_system_audit_logs_created_at ON public.system_audit_logs(created_at);

-- 2. Migrate existing logs (Optional/Safe Insert)
DO $$
BEGIN
    -- Incident Logs
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'incident_logs') THEN
        INSERT INTO public.system_audit_logs (doc_id, doc_type, action, details, user_email, created_at)
        SELECT 
            incident_id as doc_id, 
            'incident' as doc_type, 
            split_part(action, ' | ', 1) as action,
            CASE WHEN action LIKE '% | %' THEN split_part(action, ' | ', 2) ELSE NULL END as details,
            user_email,
            created_at
        FROM public.incident_logs
        ON CONFLICT DO NOTHING;
    END IF;

    -- Checklist Logs
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'checklist_logs') THEN
        INSERT INTO public.system_audit_logs (doc_id, doc_type, action, details, user_email, created_at)
        SELECT 
            doc_id, 
            'checklist' as doc_type, 
            split_part(action, ' | ', 1) as action,
            CASE WHEN action LIKE '% | %' THEN split_part(action, ' | ', 2) ELSE NULL END as details,
            user_email,
            created_at
        FROM public.checklist_logs
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- 3. Atomic Workflow Approval RPC
CREATE OR REPLACE FUNCTION public.handle_approval_step(
    p_doc_id UUID,
    p_doc_type TEXT,
    p_step_id UUID,
    p_approver_id UUID,
    p_user_email TEXT,
    p_sig_data TEXT,
    p_comment TEXT,
    p_is_remote BOOLEAN,
    p_log_details TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_step_order INT;
    v_next_step_id UUID;
    v_target_table TEXT;
    v_result JSONB;
BEGIN
    -- 1. Get Current Step Info & Validate
    SELECT step_order INTO v_step_order
    FROM public.document_approvals
    WHERE id = p_step_id AND status = 'pending';

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Step not ready for approval or already processed');
    END IF;

    -- 2. Update Current Step Status
    UPDATE public.document_approvals
    SET 
        status = 'approved',
        approver_id = p_approver_id,
        signature_data = p_sig_data,
        comment = p_comment,
        action_at = NOW(),
        verified_by_pin = p_is_remote
    WHERE id = p_step_id;

    -- 3. Find Next Sequential Step
    SELECT id INTO v_next_step_id
    FROM public.document_approvals
    WHERE doc_id = p_doc_id AND step_order = v_step_order + 1
    ORDER BY step_order ASC
    LIMIT 1;

    IF v_next_step_id IS NOT NULL THEN
        -- Unlock next step (set to pending)
        UPDATE public.document_approvals
        SET status = 'pending'
        WHERE id = v_next_step_id;
        
        v_result := jsonb_build_object('success', true, 'is_final', false);
    ELSE
        -- 4. No more steps -> Final Approval (Close Document)
        v_target_table := CASE WHEN lower(p_doc_type) = 'checklist' THEN 'checklist_docs' ELSE 'incidents' END;
        
        -- Note: using dynamic SQL for table switching
        EXECUTE format('UPDATE public.%I SET status = ''Closed'', workflow_status = ''approved'' WHERE id = %L', v_target_table, p_doc_id);
        
        v_result := jsonb_build_object('success', true, 'is_final', true);
    END IF;

    -- 5. Record Centralized Audit Log
    INSERT INTO public.system_audit_logs (doc_id, doc_type, action, details, user_email, metadata)
    VALUES (
        p_doc_id, 
        lower(p_doc_type), 
        'Approved', 
        p_log_details, 
        p_user_email,
        jsonb_build_object('step_order', v_step_order, 'is_remote', p_is_remote, 'rpc', true)
    );

    RETURN v_result;
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
