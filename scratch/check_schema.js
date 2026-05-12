const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkSchema() {
  const { data: user } = await supabase.from('user_profiles').select('signature_pin').eq('email', 'admin@dowa-tht.co.th').single();
  console.log('signature_pin length:', user.signature_pin?.length);
  console.log('signature_pin value:', user.signature_pin);
}

checkSchema();
