
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

async function repairIncident() {
  const caseNumber = 'DTT-INC-2604-004';
  const assignedAt = '2026-04-27T01:20:00.000Z'; // 08:20 GMT+7 is 01:20 UTC
  
  const { data, error } = await supabase
    .from('incidents')
    .update({ assigned_at: assignedAt })
    .eq('case_number', caseNumber)
    .select();

  if (error) {
    console.error('Repair Error:', error);
  } else {
    console.log('Repair Success for:', caseNumber);
    console.log('New Data:', data[0]);
  }
}

repairIncident();
