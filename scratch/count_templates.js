
const { createClient } = require('@supabase/supabase-js');

async function countTemplates() {
  const supabaseUrl = 'https://fhcsvvlwhwqzlsltrkuq.supabase.co';
  const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoY3N2dmx3aHdxemxzbHRya3VxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzA5NjI0MiwiZXhwIjoyMDkyNjcyMjQyfQ.LQBWUrOfgg8KZ2lP-kShMqqj4wONj01hY7AVB2GTfY8';
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { count } = await supabase
    .from('checklist_templates')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);

  console.log('Active templates count:', count);
}

countTemplates();
