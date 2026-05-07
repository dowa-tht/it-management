
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = 'https://fhcsvvlwhwqzlsltrkuq.supabase.co'
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoY3N2dmx3aHdxemxzbHRya3VxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzA5NjI0MiwiZXhwIjoyMDkyNjcyMjQyfQ.LQBWUrOfgg8KZ2lP-kShMqqj4wONj01hY7AVB2GTfY8'

async function verify() {
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY)
  
  // 1. Get Natthawut's Profile
  const { data: user } = await supabase.from('user_profiles').select('id, role').eq('email', 'natthawut@dowa-tht.co.th').single()
  console.log('User Profile:', JSON.stringify(user, null, 2))

  // 2. Mock the query from dashboard.js/workflow.js
  const { data: pending, error } = await supabase.from('document_approvals')
    .select('id, role_required, approver_id')
    .eq('status', 'pending')
    .or(`approver_id.eq.${user.id},and(approver_id.is.null,role_required.eq.${user.role})`)
  
  if (error) console.error(error)
  else {
    console.log('Pending Approvals for Natthawut:', JSON.stringify(pending, null, 2))
    console.log('Count:', pending.length)
  }
}

verify()
