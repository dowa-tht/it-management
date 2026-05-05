const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function listAllProfiles() {
  console.log('📋 Listing all user_profiles...')
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
  
  if (error) {
    console.error('❌ Error:', error.message)
  } else {
    console.table(data)
  }
}

listAllProfiles()
