const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function resetPin() {
  const hash = bcrypt.hashSync('123456', 10);
  const { error } = await supabase.from('user_profiles').update({ signature_pin: hash }).eq('email', 'admin@dowa-tht.co.th');
  if (error) console.error('Error:', error);
  else console.log('PIN reset to 123456 for admin@dowa-tht.co.th');
}

resetPin();
