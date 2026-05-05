const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceKey)

const ROLE_MAP = {
  superuser:     'administrator',
  administrator: 'administrator',
  supervisor:    'supervisor',
  approval:      'approval',
  guest:         'guest',
  visitor:       'guest',
  user:          'guest',
}

async function normalizeAllRoles() {
  console.log('🔄 Normalizing all roles in database...')

  const { data: profiles, error } = await supabase.from('user_profiles').select('id, role')
  
  if (error) {
    console.error('❌ Error:', error.message)
    return
  }

  for (const profile of profiles) {
    const raw = profile.role ? profile.role.toLowerCase() : 'guest'
    const target = ROLE_MAP[raw] || 'guest'
    
    if (profile.role !== target) {
      console.log(`🛠️ Updating ${profile.id}: ${profile.role} -> ${target}`)
      await supabase.from('user_profiles').update({ role: target }).eq('id', profile.id)
    }
  }

  console.log('✅ Role Normalization Complete!')
}

normalizeAllRoles()
