
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://fhcsvvlwhwqzlsltrkuq.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoY3N2dmx3aHdxemxzbHRya3VxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzA5NjI0MiwiZXhwIjoyMDkyNjcyMjQyfQ.LQBWUrOfgg8KZ2lP-kShMqqj4wONj01hY7AVB2GTfY8');

async function check() {
  const { data } = await supabase.from('incident_logs').select('*').limit(1);
  if (data && data.length > 0) {
    console.log(Object.keys(data[0]));
  } else {
    // If no data, try to get from rpc if exists or just assume.
    console.log("No data in incident_logs, check checklist_logs");
    const { data: d2 } = await supabase.from('checklist_logs').select('*').limit(1);
    if (d2 && d2.length > 0) console.log(Object.keys(d2[0]));
  }
}
check();
