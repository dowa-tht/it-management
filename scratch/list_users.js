const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fhcsvvlwhwqzlsltrkuq.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoY3N2dmx3aHdxemxzbHRya3VxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzA5NjI0MiwiZXhwIjoyMDkyNjcyMjQyfQ.LQBWUrOfgg8KZ2lP-kShMqqj4wONj01hY7AVB2GTfY8';

const supabase = createClient(supabaseUrl, serviceKey);

async function listUsers() {
  const { data, error } = await supabase
    .from('user_registry')
    .select('email, user_role, full_name, id')
    .limit(50);

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Users:', JSON.stringify(data, null, 2));
  }
}

listUsers();
