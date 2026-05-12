const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function checkUser() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error('Missing Supabase credentials');
    return;
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  console.log('Checking for test_admin@dowa.local in user_profiles...');
  const { data: profiles, error: profileError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('email', 'test_admin@dowa.local')
    .maybeSingle();

  if (profileError) {
    console.error('Error fetching profile:', profileError);
  } else if (profiles) {
    console.log('Found profile:', profiles);
  } else {
    console.log('No profile found for test_admin@dowa.local');
  }

  console.log('\nChecking in Auth Users...');
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

  if (authError) {
    console.error('Error listing auth users:', authError);
  } else {
    const user = authUsers.users.find(u => u.email === 'test_admin@dowa.local');
    if (user) {
      console.log('Found auth user:', {
        id: user.id,
        email: user.email,
        last_sign_in_at: user.last_sign_in_at
      });
    } else {
      console.log('No auth user found for test_admin@dowa.local');
    }
  }
}

checkUser();
