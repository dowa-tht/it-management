const { createClient } = require('@supabase/supabase-js');
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

async function countWhitelist() {
  const { count, error } = await supabase
    .from('user_whitelist')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error('Error counting whitelist:', error);
  } else {
    console.log(`📊 Total rows in user_whitelist: ${count}`);
  }
}

countWhitelist();
