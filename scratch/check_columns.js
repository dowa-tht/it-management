const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://fhcsvvlwhwqzlsltrkuq.supabase.co' 
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoY3N2dmx3aHdxemxzbHRya3VxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzA5NjI0MiwiZXhwIjoyMDkyNjcyMjQyfQ.LQBWUrOfgg8KZ2lP-kShMqqj4wONj01hY7AVB2GTfY8'

async function checkColumns() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  
  const { data, error } = await supabase.from('checklist_logs').select('*').limit(1)
  if (data && data.length > 0) {
    console.log('Columns in checklist_logs:', Object.keys(data[0]))
  } else {
    console.log('No data found in checklist_logs to inspect columns.')
  }
}

checkColumns()
