const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkBoth() {
  const { data: inc } = await supabase.from('incidents').select('id, reported_by_id, status').eq('id', '224332a5-f213-4a33-98c8-dabf06c8a51f').single();
  console.log('Incident reported_by_id:', inc.reported_by_id);
  console.log('Type:', typeof inc.reported_by_id);
  
  const { data: p } = await supabase.from('user_profiles').select('id, email').eq('email', 'admin@dowa-tht.co.th').single();
  console.log('User id:', p.id);
  console.log('Type:', typeof p.id);
  
  console.log('Are they equal?', inc.reported_by_id === p.id);
}

checkBoth();
