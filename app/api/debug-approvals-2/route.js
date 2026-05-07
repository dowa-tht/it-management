import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const { data: checklists } = await supabase
    .from('checklist_docs')
    .select('id, doc_no, workflow_status, assigned_approver_id')
    .eq('workflow_status', 'pending')

  const { data: incidents } = await supabase
    .from('incidents')
    .select('id, case_number, status, assigned_approver_id')
    .eq('status', 'Pending Approval')

  const { data: approvals } = await supabase
    .from('document_approvals')
    .select('*')

  return NextResponse.json({
    checklists,
    incidents,
    approvals
  })
}
