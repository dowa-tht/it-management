const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function inspectDoc() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const { data, error } = await supabase.from('checklist_docs').select('id, doc_no, created_by').eq('doc_no', 'DTT-CHK-2605-005').single()
  
  if (error) {
    console.error('Error:', error.message)
  } else {
    console.log('Document Data:', data)
  }
}

inspectDoc()
