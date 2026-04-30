
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...value] = line.split('=');
  if (key && value) env[key.trim()] = value.join('=').trim().replace(/^"|"$/g, '');
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function checkOrphan() {
  const email = 'admin_dtt@dowa-tht.co.th';
  
  console.log(`--- Checking Email: ${email} ---`);
  
  const { data: ext } = await supabase.from('external_users').select('*').eq('email', email);
  console.log('External Users:', ext);
  
  const { data: reg } = await supabase.from('user_registry').select('*').eq('email', email);
  console.log('User Registry:', reg);
  
  const { data: prof } = await supabase.from('user_profiles').select('*').eq('id', ext?.[0]?.id || '00000000-0000-0000-0000-000000000000');
  console.log('User Profiles (by ID):', prof);
}

checkOrphan();
