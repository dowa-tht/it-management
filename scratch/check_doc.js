
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = 'https://fhcsvvlwhwqzlsltrkuq.supabase.co'
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoY3N2dmx3aHdxemxzbHRya3VxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzA5NjI0MiwiZXhwIjoyMDkyNjcyMjQyfQ.LQBWUrOfgg8KZ2lP-kShMqqj4wONj01hY7AVB2GTfY8'

async function checkDoc() {
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY)
  const { data: approvals } = await supabase.from('document_approvals').select('*').eq('status', 'pending').limit(1)
  if (approvals && approvals.length > 0) {
    const { data: doc } = await supabase.from('checklist_docs').select('*').eq('id', approvals[0].doc_id).single()
    console.log('Approval Step:', JSON.stringify(approvals[0], null, 2))
    console.log('Checklist Doc:', JSON.stringify(doc, null, 2))
  }
}

checkDoc()
