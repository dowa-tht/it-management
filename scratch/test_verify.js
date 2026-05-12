const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function verifyEmployeePIN(userId, pin) {
  let user;
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)
  
  if (isUUID) {
    const { data } = await supabase.from('user_profiles').select('signature_pin').eq('id', userId).maybeSingle()
    user = data
  }

  if (!user && userId) {
    const { data } = await supabase.from('user_profiles').select('signature_pin').eq('email', userId).maybeSingle()
    user = data
  }

  console.log('User found:', user);
  const isValid = await bcrypt.compare(pin, user?.signature_pin || '');
  console.log('Is valid?', isValid);
  return isValid;
}

verifyEmployeePIN('fe76ce6a-b9b8-41f2-ae2d-09d2a7b5dd55', '123456');
