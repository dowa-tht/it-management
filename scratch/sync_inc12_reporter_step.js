const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

const env = fs.existsSync('.env.local') ? fs.readFileSync('.env.local', 'utf8') : ''
for (const line of env.split(/\r?\n/)) {
  const match = line.match(/^([^#=]+)=(.*)$/)
  if (match && !process.env[match[1]]) {
    process.env[match[1]] = match[2].replace(/^["']|["']$/g, '')
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function main() {
  const caseNo = 'DTT-INC-2605-012'

  const { data: incident, error: incidentError } = await supabase
    .from('incidents')
    .select('id, reported_by_id')
    .eq('case_number', caseNo)
    .single()

  if (incidentError) throw incidentError
  if (!incident?.reported_by_id) throw new Error('Incident reporter is missing reported_by_id')

  const { data, error } = await supabase
    .from('document_approvals')
    .update({ approver_id: incident.reported_by_id })
    .eq('doc_id', incident.id)
    .eq('doc_type', 'incident')
    .eq('role_required', 'reporter')
    .in('status', ['pending', 'waiting'])
    .select('id, step_order, status, role_required, approver_id')

  if (error) throw error
  console.log(JSON.stringify({ caseNo, syncedApproverId: incident.reported_by_id, updatedSteps: data }, null, 2))
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
