
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

async function debugIncident() {
  const { data, error } = await supabase
    .from('incidents')
    .select('id, case_number, status, assigned_to, assigned_at, acknowledged_at, created_at, resolved_at')
    .eq('case_number', 'DTT-INC-2604-004')
    .single();

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Incident Data:', data);
  }
}

debugIncident();
