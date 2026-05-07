
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = 'https://fhcsvvlwhwqzlsltrkuq.supabase.co'
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoY3N2dmx3aHdxemxzbHRya3VxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzA5NjI0MiwiZXhwIjoyMDkyNjcyMjQyfQ.LQBWUrOfgg8KZ2lP-kShMqqj4wONj01hY7AVB2GTfY8'

async function checkApprovals() {
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY)
  const { data, error } = await supabase.from('document_approvals').select('id, doc_type, status, role_required, approver_id').eq('status', 'pending')
  if (error) console.error(error)
  else console.log(JSON.stringify(data, null, 2))
}

checkApprovals()
