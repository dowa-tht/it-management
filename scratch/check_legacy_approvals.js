const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function checkData() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  console.log('--- Pending Checklists ---')
  const { data: checklists } = await supabase
    .from('checklist_docs')
    .select('id, doc_no, workflow_status, assigned_approver_id')
    .eq('workflow_status', 'pending')
  console.log(checklists)

  console.log('\n--- Pending Incidents ---')
  const { data: incidents } = await supabase
    .from('incidents')
    .select('id, case_number, status, assigned_approver_id')
    .eq('status', 'Pending Approval')
  console.log(incidents)

  console.log('\n--- Document Approvals table content ---')
  const { data: approvals } = await supabase
    .from('document_approvals')
    .select('*')
  console.log(approvals)
}

checkData()
