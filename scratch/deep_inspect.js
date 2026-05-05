const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://fhcsvvlwhwqzlsltrkuq.supabase.co' 
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoY3N2dmx3aHdxemxzbHRya3VxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzA5NjI0MiwiZXhwIjoyMDkyNjcyMjQyfQ.LQBWUrOfgg8KZ2lP-kShMqqj4wONj01hY7AVB2GTfY8'

async function deepInspect() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  
  console.log('--- Document Detail (DTT-CHK-2605-005) ---')
  const { data: doc } = await supabase.from('checklist_docs').select('*').eq('doc_no', 'DTT-CHK-2605-005').single()
  console.log(JSON.stringify(doc, null, 2))
  
  console.log('\n--- Logs for this Document ---')
  const { data: logs } = await supabase.from('checklist_logs').select('*').eq('doc_id', doc?.id)
  console.log(JSON.stringify(logs, null, 2))

  if (doc?.assigned_approver_id) {
    console.log('\n--- Assigned Approver Profile ---')
    const { data: profile } = await supabase.from('user_profiles').select('id, email, full_name').eq('id', doc.assigned_approver_id).single()
    console.log(JSON.stringify(profile, null, 2))
  }
}

deepInspect()
