
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

async function syncUser() {
  const email = 'admin_dtt@dowa-tht.co.th';
  
  // 1. ดึงข้อมูลจาก external_users
  const { data: ext } = await supabase.from('external_users').select('*').eq('email', email).single();
  
  if (!ext) {
    console.log('User not found in external_users');
    return;
  }
  
  // 2. ยัดลง user_registry
  const { error } = await supabase.from('user_registry').upsert({
    email: ext.email,
    full_name: ext.full_name,
    user_role: ext.role,
    external_user_id: ext.id,
    is_active: true,
    can_be_assignee: false
  }, { onConflict: 'email' });

  if (error) {
    console.error('Sync Error:', error);
  } else {
    console.log('--- Sync Success! User should now appear in the table ---');
  }
}

syncUser();
