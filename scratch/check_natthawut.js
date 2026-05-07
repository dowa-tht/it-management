
const { createClient } = require('@supabase/supabase-js');

async function checkNatthawut() {
  const supabaseUrl = 'https://fhcsvvlwhwqzlsltrkuq.supabase.co';
  const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoY3N2dmx3aHdxemxzbHRya3VxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzA5NjI0MiwiZXhwIjoyMDkyNjcyMjQyfQ.LQBWUrOfgg8KZ2lP-kShMqqj4wONj01hY7AVB2GTfY8';
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('full_name', 'Natthawut Hapang')
    .single();

  console.log('Natthawut Profile:', JSON.stringify(profile, null, 2));
}

checkNatthawut();
