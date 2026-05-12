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
  const email = 'admin_dtt@dowa-tht.co.th'
  const caseNo = 'DTT-INC-2605-012'

  const { data: user, error: userErr } = await supabase
    .from('user_profiles')
    .select('id,email,full_name,role,is_active')
    .eq('email', email)
    .maybeSingle()

  console.log('USER_ERR', userErr?.message || null)
  console.log('USER', JSON.stringify(user, null, 2))

  const { data: incident, error: incidentErr } = await supabase
    .from('incidents')
    .select('id,case_number,title,status,workflow_status,reported_by,reported_by_id,assigned_approver_id')
    .eq('case_number', caseNo)
    .maybeSingle()

  console.log('INCIDENT_ERR', incidentErr?.message || null)
  console.log('INCIDENT', JSON.stringify(incident, null, 2))

  if (!user || !incident) return

  const { data: steps, error: stepsErr } = await supabase
    .from('document_approvals')
    .select('id,doc_id,doc_type,step_order,status,role_required,approver_id,action_at,comment')
    .eq('doc_id', incident.id)
    .order('step_order')

  console.log('STEPS_ERR', stepsErr?.message || null)
  console.log('STEPS', JSON.stringify(steps, null, 2))

  const matchingPending = (steps || []).filter(step =>
    step.status === 'pending' && (
      step.approver_id === user.id ||
      (!step.approver_id && step.role_required === user.role)
    )
  )

  console.log('MATCHING_PENDING_FOR_DASHBOARD_COUNT', JSON.stringify(matchingPending, null, 2))
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
