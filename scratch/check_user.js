const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkUser() {
  const email = 'natthawut@dowa-tht.co.th'
  
  console.log(`🔍 Checking user: ${email}`)
  
  // 1. Check user_profiles
  const { data: profile, error: profError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('email', email)
    .single()
    
  if (profError) {
    console.log('❌ Not found in user_profiles:', profError.message)
  } else {
    console.log('✅ Found in user_profiles:', profile)
  }

  // 2. Check auth.users
  const { data: { users }, error: authError } = await supabase.auth.admin.listUsers()
  const authUser = users.find(u => u.email === email)
  
  if (authUser) {
    console.log('✅ Found in auth.users:', authUser.id)
  } else {
    console.log('❌ Not found in auth.users')
  }
}

checkUser()
