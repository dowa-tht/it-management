const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkAuthAndRead() {
  const { data: { users }, error } = await supabase.auth.admin.listUsers();
  const admin = users.find(u => u.email === 'admin@dowa-tht.co.th');
  console.log('Auth user id:', admin?.id);
}

checkAuthAndRead();
