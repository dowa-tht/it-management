const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fhcsvvlwhwqzlsltrkuq.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoY3N2dmx3aHdxemxzbHRya3VxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzA5NjI0MiwiZXhwIjoyMDkyNjcyMjQyfQ.LQBWUrOfgg8KZ2lP-kShMqqj4wONj01hY7AVB2GTfY8';

const supabase = createClient(supabaseUrl, serviceKey);

async function resetPassword() {
  const { data, error } = await supabase.auth.admin.updateUserById(
    '836aa99e-c7cb-49c0-acc9-e9efc2686bb2',
    { password: 'Password123!' }
  );

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Password reset successful for antigravity (exam@123.com)');
  }
}

resetPassword();
