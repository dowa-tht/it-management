const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testPin() {
  const { data: user } = await supabase.from('user_profiles').select('id, email, signature_pin').eq('email', 'admin@dowa-tht.co.th').single()
  console.log('User found:', user.email);
  console.log('Hash:', user.signature_pin);
  
  const isValid123456 = bcrypt.compareSync('123456', user.signature_pin);
  console.log('Is 123456 valid?', isValid123456);
  
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id);
  console.log('Is valid UUID?', isUUID);
}

testPin();
