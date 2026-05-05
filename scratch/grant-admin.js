const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

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

async function grantAccess() {
  console.log(`Granting access to: ${email}`);
  
  const { data, error } = await supabase
    .from('user_whitelist')
    .insert([{ email_hash: emailHash }]);

  if (error) {
    if (error.code === '23505') {
      console.log('User is already in whitelist.');
    } else {
      console.error('Error granting access:', error);
    }
  } else {
    console.log('Successfully added to whitelist!');
  }
}

grantAccess();
