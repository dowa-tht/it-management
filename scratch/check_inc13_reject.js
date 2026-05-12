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
  const { data: incident, error: incidentError } = await supabase
    .from('incidents')
    .select('id,case_number,title,status,workflow_status')
    .eq('case_number', 'DTT-INC-2605-013')
    .maybeSingle()

  console.log('INCIDENT_ERR', incidentError?.message || null)
  console.log('INCIDENT', JSON.stringify(incident, null, 2))
  if (!incident) return

  const { data: logs, error: logsError } = await supabase
    .from('system_audit_logs')
    .select('action,details,user_email,created_at,metadata')
    .eq('doc_id', incident.id)
    .order('created_at', { ascending: false })

  console.log('LOGS_ERR', logsError?.message || null)
  console.log('LOGS', JSON.stringify(logs, null, 2))

  const { data: steps, error: stepsError } = await supabase
    .from('document_approvals')
    .select('step_order,status,role_required,comment,action_at,approver_id')
    .eq('doc_id', incident.id)
    .order('step_order')

  console.log('STEPS_ERR', stepsError?.message || null)
  console.log('STEPS', JSON.stringify(steps, null, 2))
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
