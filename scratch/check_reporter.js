const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkReporter() {
  const { data: user } = await supabase.from('user_profiles').select('id, email, full_name').eq('id', 'fe76ce6a-b9b8-41f2-ae2d-09d2a7b5dd55').single()
  console.log('Reporter:', user);
  
  const { data: admin } = await supabase.from('user_profiles').select('id, email, full_name').eq('email', 'admin@dowa-tht.co.th').single()
  console.log('Admin:', admin);
}

checkReporter();
