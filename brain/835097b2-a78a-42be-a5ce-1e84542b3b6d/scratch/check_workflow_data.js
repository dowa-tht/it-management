const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://fhcsvvlwhwqzlsltrkuq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoY3N2dmx3aHdxemxzbHRya3VxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzA5NjI0MiwiZXhwIjoyMDkyNjcyMjQyfQ.LQBWUrOfgg8KZ2lP-kShMqqj4wONj01hY7AVB2GTfY8'
);

async function check() {
  const { data: incidents } = await supabase
    .from('incidents')
    .select('id, case_number, severity, status')
    .eq('case_number', 'DTT-INC-2605-007');
  
  console.log('--- Incident DTT-INC-2605-007 ---');
  console.log(JSON.stringify(incidents, null, 2));

  if (incidents && incidents.length > 0) {
    const { data: steps } = await supabase
      .from('document_approvals')
      .select('*')
      .eq('doc_id', incidents[0].id);
    
    console.log('\n--- Approval Steps ---');
    console.log(JSON.stringify(steps, null, 2));
  }
}

check();
