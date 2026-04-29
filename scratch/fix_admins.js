const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://fhcsvvlwhwqzlsltrkuq.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoY3N2dmx3aHdxemxzbHRya3VxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzA5NjI0MiwiZXhwIjoyMDkyNjcyMjQyfQ.LQBWUrOfgg8KZ2lP-kShMqqj4wONj01hY7AVB2GTfY8');

const emails = ['natthawut@dowa-tht.co.th', 'admin@dowa-tht.co.th'];

async function run() {
  const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
  if (authError) {
    console.error('Auth Error:', authError);
    return;
  }

  for (const email of emails) {
    const user = users.find(u => u.email === email);
    if (user) {
      // 1. Reset Password
      await supabase.auth.admin.updateUserById(user.id, { password: 'DowaAdmin123!' });
      
      // 2. Check/Fix Profile
      const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single();
      
      if (!profile) {
        await supabase.from('user_profiles').upsert({
          id: user.id,
          full_name: email.split('@')[0],
          role: 'superuser',
          is_active: true
        });
        console.log(`✅ Created profile & reset password for ${email}`);
      } else {
        // บังคับให้เป็น superuser เพื่อให้เข้าได้แน่นอน
        await supabase.from('user_profiles').update({ role: 'superuser', is_active: true }).eq('id', user.id);
        console.log(`✅ Updated role & reset password for ${email}`);
      }
    } else {
      console.log(`❌ ${email} not found in Supabase Auth`);
    }
  }
}

run();
