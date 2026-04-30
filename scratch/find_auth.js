const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fhcsvvlwhwqzlsltrkuq.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoY3N2dmx3aHdxemxzbHRya3VxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzA5NjI0MiwiZXhwIjoyMDkyNjcyMjQyfQ.LQBWUrOfgg8KZ2lP-kShMqqj4wONj01hY7AVB2GTfY8';

const supabase = createClient(supabaseUrl, serviceKey);

async function findByEmail() {
  const { data: users, error } = await supabase.auth.admin.listUsers();

  if (error) {
    console.error('Error:', error);
  } else {
    const user = users.users.find(u => u.email === 'exam@123.com');
    if (user) {
      console.log('User found in Auth:', user.id);
    } else {
      console.log('User not found in Auth.');
    }
  }
}

findByEmail();
