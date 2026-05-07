const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = 'https://fhcsvvlwhwqzlsltrkuq.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoY3N2dmx3aHdxemxzbHRya3VxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzA5NjI0MiwiZXhwIjoyMDkyNjcyMjQyfQ.LQBWUrOfgg8KZ2lP-kShMqqj4wONj01hY7AVB2GTfY8'

async function checkUser(email) {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  console.log(`Checking user: ${email}...`)

  const { data: { users }, error: userError } = await supabase.auth.admin.listUsers()
  if (userError) {
    console.error('Error listing users:', userError)
    return
  }

  const targetUser = users.find(u => u.email === email)
  if (!targetUser) {
    console.log(`User ${email} not found in Auth.`)
    return
  }

  console.log(`User ID: ${targetUser.id}`)

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', targetUser.id)
    .single()

  if (profileError) {
    console.error('Error fetching profile:', profileError)
  } else {
    console.log('Profile Data:', JSON.stringify(profile, null, 2))
  }
}

checkUser('thevoob@gmail.com')
