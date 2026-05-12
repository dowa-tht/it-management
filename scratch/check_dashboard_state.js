const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkUsers() {
  const { data } = await supabase.from('user_profiles').select('id, email, role, full_name').in('email', ['admin@dowa-tht.co.th', 'administrator@dowa-tht.co.th'])
  console.log('Users:', data)
  
  const { data: steps } = await supabase.from('document_approvals').select('*').order('created_at', { ascending: false }).limit(5)
  console.log('Recent Steps:', steps)
  
  const { data: inc } = await supabase.from('incidents').select('id, case_number, status, workflow_status').order('created_at', { ascending: false }).limit(2)
  console.log('Recent Incidents:', inc)
}

checkUsers();
