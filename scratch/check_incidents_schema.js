
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function checkSchema() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data, error } = await supabase.rpc('get_table_columns', { table_name: 'incidents' });
  
  if (error) {
    // If RPC doesn't exist, try a simple query to see columns
    const { data: cols, error: colError } = await supabase.from('incidents').select('*').limit(0);
    if (colError) console.error('Error fetching columns:', colError);
    else console.log('Columns in incidents:', Object.keys(cols[0] || {}));
  } else {
    console.log('Columns:', data);
  }
}

checkSchema();
