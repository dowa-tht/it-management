const { createClient } = require('@supabase/supabase-js')
const crypto = require('crypto')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceKey)

function hashEmail(email) {
  if (!email) return null
  return crypto.createHash('sha256').update(email.toLowerCase().trim()).digest('hex')
}

async function restoreUser() {
  const email = 'natthawut@dowa-tht.co.th'
  const hashed = hashEmail(email)
  
  console.log(`🛡️ Restoring access for: ${email}`)
  console.log(`🔑 Hash: ${hashed}`)

  // 1. เพิ่มเข้า Whitelist ทันที
  const { error: wError } = await supabase
    .from('user_whitelist')
    .upsert({ email_hash: hashed })

  if (wError) {
    console.error('❌ Whitelist Error:', wError.message)
  } else {
    console.log('✅ Whitelist Restored!')
  }
}

restoreUser()
