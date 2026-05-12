const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkPin() {
  const { data } = await supabase.from('user_profiles').select('email, signature_pin').eq('email', 'admin@dowa-tht.co.th').single()
  console.log('Admin Profile:', data)
}

checkPin();
