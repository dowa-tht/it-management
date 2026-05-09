
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function listTables() {
  const { data, error } = await supabase.rpc('get_tables'); 
  // If rpc doesn't exist, try a direct query to information_schema
  if (error) {
    const { data: tables, error: tableError } = await supabase
      .from('user_profiles') // just to check connection
      .select('count', { count: 'exact', head: true });
    
    console.log('Tables check via info schema...');
    const { data: infoData, error: infoError } = await supabase
      .rpc('exec_sql', { sql: "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'" });
    
    if (infoError) {
        console.error('Error fetching tables:', infoError);
    } else {
        console.log('Tables in public schema:');
        console.table(infoData);
    }
  } else {
    console.table(data);
  }
}

listTables();
