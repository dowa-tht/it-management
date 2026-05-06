import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://fhcsvvlwhwqzlsltrkuq.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoY3N2dmx3aHdxemxzbHRya3VxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzA5NjI0MiwiZXhwIjoyMDkyNjcyMjQyfQ.LQBWUrOfgg8KZ2lP-kShMqqj4wONj01hY7AVB2GTfY8'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function migrate() {
  console.log('Starting migration: Resolved -> Closed...')

  const { data: incData, error: incError } = await supabase
    .from('incidents')
    .update({ status: 'Closed' })
    .eq('status', 'Resolved')
    .select()

  if (incError) console.error('Error updating incidents:', incError)
  else console.log(`Updated ${incData?.length || 0} incidents.`)
  
  const { data: cData, error: cError } = await supabase
    .from('checklist_documents')
    .update({ status: 'Closed' })
    .eq('status', 'Resolved')
    .select()

  if (cError) console.error('Error updating checklist_documents:', cError)
  else console.log(`Updated ${cData?.length || 0} checklist_documents.`)

  console.log('Migration complete.')
}

migrate()
