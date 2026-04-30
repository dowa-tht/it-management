const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fhcsvvlwhwqzlsltrkuq.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoY3N2dmx3aHdxemxzbHRya3VxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzA5NjI0MiwiZXhwIjoyMDkyNjcyMjQyfQ.LQBWUrOfgg8KZ2lP-kShMqqj4wONj01hY7AVB2GTfY8';

const supabase = createClient(supabaseUrl, serviceKey);

async function createUser() {
  const { data, error } = await supabase.auth.admin.createUser({
    email: 'exam@123.com',
    password: 'Password123!',
    email_confirm: true,
    user_metadata: { full_name: 'Antigravity' }
  });

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('User created:', data.user.id);
    
    // Update user_registry with the new ID
    const { error: updateError } = await supabase
      .from('user_registry')
      .update({ id: data.user.id })
      .eq('email', 'exam@123.com');
      
    if (updateError) console.error('Update Error:', updateError);
    else console.log('Registry updated.');
  }
}

createUser();
