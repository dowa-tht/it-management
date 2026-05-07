
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://fhcsvvlwhwqzlsltrkuq.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoY3N2dmx3aHdxemxzbHRya3VxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzA5NjI0MiwiZXhwIjoyMDkyNjcyMjQyfQ.LQBWUrOfgg8KZ2lP-kShMqqj4wONj01hY7AVB2GTfY8');

async function checkUser() {
  const { data: user, error } = await supabase
    .from('user_profiles')
    .select('id, full_name, email, signature_pin')
    .or('email.eq.admin_dtt@dowa-tht.co.th,full_name.eq.admin_dtt@dowa-tht.co.th')
    .single();

  if (error) {
    console.error('User not found:', error);
    return;
  }
  console.log('User found:', user);
}
checkUser();
