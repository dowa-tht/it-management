const bcrypt = require('bcryptjs')
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

const env = fs.existsSync('.env.local') ? fs.readFileSync('.env.local', 'utf8') : ''
for (const line of env.split(/\r?\n/)) {
  const match = line.match(/^([^#=]+)=(.*)$/)
  if (match && !process.env[match[1]]) {
    process.env[match[1]] = match[2].replace(/^["']|["']$/g, '')
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function main() {
  const { data: user, error } = await supabase
    .from('user_profiles')
    .select('id, email, full_name, role, signature_pin')
    .eq('email', 'admin_dtt@dowa-tht.co.th')
    .single()

  if (error) throw error

  console.log(JSON.stringify({
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    role: user.role,
    has_signature_pin: Boolean(user.signature_pin),
    pin_hash_prefix: user.signature_pin ? user.signature_pin.slice(0, 4) : null,
    pin_matches_provided: user.signature_pin ? await bcrypt.compare('212224', user.signature_pin) : false
  }, null, 2))
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
