const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkStepsNow() {
  const { data: inc } = await supabase.from('incidents').select('id, case_number, reported_by, reported_by_id').eq('id', '224332a5-f213-4a33-98c8-dabf06c8a51f').single()
  console.log('Incident:', inc)
  
  if (inc) {
    const { data: steps } = await supabase.from('document_approvals').select('id, step_order, role_required, approver_id, status').eq('doc_id', inc.id).order('step_order')
    console.log('Steps:', steps)
  }
}

checkStepsNow();
