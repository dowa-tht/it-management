const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testColumns() {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('pin_reset_token, pin_reset_expires')
    .limit(1);

  if (error) {
    if (error.code === 'PGRST204' || error.message.includes('column') || error.message.includes('does not exist')) {
      console.log('MISSING_COLUMNS');
    } else {
      console.error('Error:', error);
    }
  } else {
    console.log('COLUMNS_EXIST');
  }
}

testColumns();
