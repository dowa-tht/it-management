
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function auditRLS() {
  console.log('🔍 Auditing RLS for approval_configs...')
  
  // 1. Check policies
  const { data: policies, error: pError } = await supabase
    .rpc('get_policies_for_table', { table_name: 'approval_configs' })
  
  if (pError) {
    // If RPC doesn't exist, try direct query to pg_policies
    const { data: pgPolicies, error: pgError } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'approval_configs')
    
    if (pgError) {
      console.log('Could not fetch policies via direct query (likely no access to pg_catalog via REST).')
      console.log('Error:', pgError.message)
    } else {
      console.log('Policies on approval_configs:', pgPolicies)
    }
  } else {
    console.log('Policies on approval_configs:', policies)
  }

  // 2. Check table structure
  const { data: columns, error: cError } = await supabase
    .from('approval_configs')
    .select('*')
    .limit(1)
  
  if (cError) {
    console.error('Error fetching sample row:', cError.message)
  } else {
    console.log('Sample row / Columns:', Object.keys(columns[0] || {}))
  }

  // 3. Check if RLS is enabled
  // We can infer this from the fact that it's throwing an RLS error.
}

auditRLS()
