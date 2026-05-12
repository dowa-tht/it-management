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
  const email = 'admin@dowa-tht.co.th'

  const { data: user, error: userError } = await supabase
    .from('user_profiles')
    .select('id, email, full_name, role, is_active')
    .eq('email', email)
    .maybeSingle()

  if (userError) throw userError
  console.log('USER', JSON.stringify(user, null, 2))

  if (!user) return

  const [{ data: byId, error: byIdError }, { data: byRole, error: byRoleError }, { data: allPending, error: allPendingError }] = await Promise.all([
    supabase.from('document_approvals').select('id, doc_id, doc_type, step_order, status, role_required, approver_id').eq('status', 'pending').eq('approver_id', user.id),
    supabase.from('document_approvals').select('id, doc_id, doc_type, step_order, status, role_required, approver_id').eq('status', 'pending').is('approver_id', null).eq('role_required', user.role),
    supabase.from('document_approvals').select('id, doc_id, doc_type, step_order, status, role_required, approver_id').eq('status', 'pending')
  ])

  if (byIdError) throw byIdError
  if (byRoleError) throw byRoleError
  if (allPendingError) throw allPendingError

  const dashboardMatches = [...(byId || []), ...(byRole || [])]
  console.log('DASHBOARD_MATCHES_COUNT', dashboardMatches.length)
  console.log('DASHBOARD_MATCHES', JSON.stringify(dashboardMatches, null, 2))
  console.log('ALL_PENDING_COUNT', allPending?.length || 0)
  console.log('ALL_PENDING', JSON.stringify(allPending, null, 2))

  const incidentIds = [...new Set((allPending || []).filter(s => s.doc_type === 'incident').map(s => s.doc_id))]
  if (incidentIds.length > 0) {
    const { data: incidents, error: incidentError } = await supabase
      .from('incidents')
      .select('id, case_number, status, workflow_status, reported_by, reported_by_id')
      .in('id', incidentIds)
    if (incidentError) throw incidentError
    console.log('PENDING_INCIDENTS', JSON.stringify(incidents, null, 2))
  }
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
