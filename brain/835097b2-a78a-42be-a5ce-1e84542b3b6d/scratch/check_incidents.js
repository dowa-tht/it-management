
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkIncidents() {
  const prefix = 'DTT-INC-2605-'
  const { data, error } = await supabase
    .from('incidents')
    .select('case_number')
    .like('case_number', `${prefix}%`)
    .order('case_number', { ascending: false })
  
  if (error) {
    console.error('Error:', error)
    return
  }

  console.log('--- Incidents with prefix DTT-INC-2605- ---')
  data.forEach(d => console.log(d.case_number))
}

checkIncidents()
