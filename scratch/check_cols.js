
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkColumns() {
  const { data, error } = await supabase
    .from('incident_logs')
    .select('*')
    .limit(1);
  
  if (error) {
    console.error('Error fetching incident_logs:', error);
  } else {
    console.log('Sample incident_log:', data[0]);
  }
}

checkColumns();
