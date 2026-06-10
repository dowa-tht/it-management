import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.production' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

async function fix() {
  const email = 'admin@dowa-tht.co.th';
  let { data: { users } } = await supabase.auth.admin.listUsers();
  let user = users.find(u => u.email === email);
  
  console.log('Checking user_profiles...');
  const { data: profile } = await supabase.from('user_profiles').select('*').eq('id', user.id).single();
  if (!profile) {
    console.log('Profile not found, creating...');
    const { error: insErr } = await supabase.from('user_profiles').insert({
      id: user.id,
      email: email,
      role: 'admin',
      is_active: true
    });
    if (insErr) console.error('Profile insert error:', insErr);
    else console.log('Profile created successfully.');
  } else {
    console.log('Profile found. Updating role to admin...');
    const { error: updErr } = await supabase.from('user_profiles').update({ role: 'admin', is_active: true }).eq('id', user.id);
    if (updErr) console.error('Profile update error:', updErr);
    else console.log('Profile updated successfully.');
  }
}
fix();
