
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://fhcsvvlwhwqzlsltrkuq.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoY3N2dmx3aHdxemxzbHRya3VxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzA5NjI0MiwiZXhwIjoyMDkyNjcyMjQyfQ.LQBWUrOfgg8KZ2lP-kShMqqj4wONj01hY7AVB2GTfY8');

async function check() {
  const { data: incident } = await supabase.from('incidents').select('id, case_number, ref_id, ref_type')
    .eq('case_number', 'DTT-INC-2605-004')
    .single();
  console.log("Incident ref:", incident);
  
  if (incident && incident.ref_id) {
    const { data: item } = await supabase.from('checklist_items').select('*').eq('id', incident.ref_id).single();
    console.log("Checklist Item:", item);
  }
}
check();
