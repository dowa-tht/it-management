const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function checkStatuses() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  console.log('--- CHECKLIST STATUSES ---')
  const { data: checklistDocs } = await supabase.from('checklist_docs').select('status, workflow_status')
  const checklistMap = {}
  checklistDocs?.forEach(d => {
    const key = `${d.status} | ${d.workflow_status || 'null'}`
    checklistMap[key] = (checklistMap[key] || 0) + 1
  })
  console.table(Object.entries(checklistMap).map(([k, v]) => ({ 'Status | WorkflowStatus': k, 'Count': v })))

  console.log('\n--- INCIDENT STATUSES ---')
  const { data: incidents } = await supabase.from('incidents').select('status, workflow_status')
  const incidentMap = {}
  incidents?.forEach(d => {
    const key = `${d.status} | ${d.workflow_status || 'null'}`
    incidentMap[key] = (incidentMap[key] || 0) + 1
  })
  console.table(Object.entries(incidentMap).map(([k, v]) => ({ 'Status | WorkflowStatus': k, 'Count': v })))
}

checkStatuses()
