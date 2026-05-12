const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkAuthUsers() {
  const { data: { users }, error } = await supabase.auth.admin.listUsers();
  const admins = users.filter(u => u.email === 'admin@dowa-tht.co.th' || u.email === 'administrator@dowa-tht.co.th');
  console.log(JSON.stringify(admins, null, 2));
}

checkAuthUsers();
