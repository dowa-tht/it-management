const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function debugApproverId() {
  const { data: step } = await supabase.from('document_approvals').select('*').eq('id', '7f824865-f580-4460-93dc-05144b2585c8').single();
  console.log('Step 2:', step);
}

debugApproverId();
