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

async function listWhitelistedUsers() {
  console.log('📋 Current Whitelisted Accounts:');

  const { data: whitelist } = await supabase.from('user_whitelist').select('email_hash');
  const { data: profiles } = await supabase.from('user_profiles').select('email, full_name, role');

  const profileMap = {};
  profiles.forEach(p => {
    const hash = crypto.createHash('sha256').update(p.email.toLowerCase()).digest('hex');
    profileMap[hash] = p;
  });

  whitelist.forEach((w, index) => {
    const user = profileMap[w.email_hash];
    if (user) {
      console.log(`${index + 1}. ${user.full_name} (${user.email}) - Role: ${user.role}`);
    } else {
      console.log(`${index + 1}. [Unknown User] - Hash: ${w.email_hash.substring(0, 10)}...`);
    }
  });
}

listWhitelistedUsers();
