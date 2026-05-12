const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkUsers() {
  const { data: users } = await supabase.from('user_profiles').select('id, email, full_name').ilike('email', '%admin%');
  console.log('Users:', users);
}

checkUsers();
