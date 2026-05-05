const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Manually parse .env.local because dotenv might not be available or needs setup
const envPath = path.resolve(process.cwd(), '.env.local');
const envConfig = fs.readFileSync(envPath, 'utf8');
envConfig.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) process.env[key.trim()] = value.trim();
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const email = 'admin@dowa-tht.co.th';
const emailHash = crypto.createHash('sha256').update(email.toLowerCase()).digest('hex');

async function checkUser() {
  console.log(`Checking email: ${email}`);
  console.log(`Email Hash: ${emailHash}`);

  // 1. Check Whitelist
  const { data: whitelist, error: wError } = await supabase
    .from('user_whitelist')
    .select('*')
    .eq('email_hash', emailHash)
    .maybeSingle();

  if (wError) console.error('Whitelist Error:', wError);
  console.log('Whitelist record:', whitelist);

  // 2. Check Profiles
  const { data: profile, error: pError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('email', email)
    .maybeSingle();

  if (pError) console.error('Profile Error:', pError);
  console.log('Profile record:', profile);
}

checkUser();
