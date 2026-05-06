
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

async function checkTable() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  
  console.log('Checking recent incidents with Pending Approval status...')
  const { data, error } = await supabase
    .from('incidents')
    .select('*')
    .ilike('status', 'Pending Approval')
    .limit(1)

  if (error) {
    console.error('Error:', error)
    return
  }

  if (data && data.length > 0) {
    console.log('Sample Data Found:', JSON.stringify(data[0], null, 2))
  } else {
    console.log('No incidents found with Pending Approval status.')
    
    console.log('Checking ALL columns of incidents table...')
    const { data: cols, error: colErr } = await supabase
      .from('incidents')
      .select('*')
      .limit(1)
    
    if (cols) console.log('Columns available:', Object.keys(cols[0]))
  }
}

checkTable()
