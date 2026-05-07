const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fhcsvvlwhwqzlsltrkuq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoY3N2dmx3aHdxemxzbHRya3VxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzA5NjI0MiwiZXhwIjoyMDkyNjcyMjQyfQ.LQBWUrOfgg8KZ2lP-kShMqqj4wONj01hY7AVB2GTfY8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUser() {
  const email = 'thevoob@gmail.com';
  
  // 1. Check user_profiles
  const { data: profile, error: pError } = await supabase
    .from('user_profiles')
    .select('id, full_name, email, role, is_onboarded, onboarding_token, force_password_change, signature_pin')
    .eq('email', email)
    .maybeSingle();

  if (pError) {
    console.log('Profile error:', pError.message);
  } else if (!profile) {
    console.log('Profile not found for:', email);
  } else {
    console.log('User Profile found:');
    console.log(JSON.stringify(profile, null, 2));
    console.log('Has PIN:', !!profile.signature_pin);
  }

  // 2. Check login_logs
  const { data: logs, error: lError } = await supabase
    .from('login_logs')
    .select('created_at, action, user_agent')
    .eq('user_email', email)
    .order('created_at', { ascending: false });

  if (lError) {
    console.log('Logs error:', lError.message);
  } else {
    console.log('\nRecent Login Logs:', logs.length);
    logs.slice(0, 10).forEach(log => {
      console.log(`${log.created_at}: ${log.action} (${log.user_agent})`);
    });
  }

  // 3. Check user_whitelist
  const crypto = require('crypto');
  const hashedEmail = crypto.createHash('sha256').update(email.toLowerCase().trim()).digest('hex');
  const { data: whitelist, error: wError } = await supabase
    .from('user_whitelist')
    .select('id')
    .eq('email_hash', hashedEmail)
    .maybeSingle();

  console.log('\nWhitelist Status:', whitelist ? '✅ Whitelisted' : '❌ Not Whitelisted');
  console.log('Email Hash:', hashedEmail);
}

checkUser();
