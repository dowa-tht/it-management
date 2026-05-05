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

async function syncWhitelist() {
  console.log('🔄 Starting whitelist synchronization...');

  // 1. Fetch all emails from user_profiles
  const { data: profiles, error: pError } = await supabase
    .from('user_profiles')
    .select('email');

  if (pError) {
    console.error('Error fetching profiles:', pError);
    return;
  }

  console.log(`Found ${profiles.length} users in profiles.`);

  // 2. Prepare hashes
  const whitelistEntries = profiles
    .filter(p => p.email)
    .map(p => ({
      email_hash: crypto.createHash('sha256').update(p.email.toLowerCase()).digest('hex')
    }));

  if (whitelistEntries.length === 0) {
    console.log('No valid emails found to sync.');
    return;
  }

  // 3. Insert into whitelist (using upsert to ignore duplicates if possible, or just insert)
  // Since we don't have a unique constraint on email_hash that we can target easily with upsert 
  // without knowing the PK, we'll use a loop or a bulk insert with ignore.
  // Actually, email_hash should be unique.
  
  const { error: wError } = await supabase
    .from('user_whitelist')
    .upsert(whitelistEntries, { onConflict: 'email_hash' });

  if (wError) {
    console.error('Error syncing whitelist:', wError);
  } else {
    console.log(`✅ Successfully synchronized ${whitelistEntries.length} users to whitelist!`);
  }
}

syncWhitelist();
