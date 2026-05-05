const { createClient } = require('@supabase/supabase-js')
const crypto = require('crypto')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceKey)

function hashEmail(email) {
  if (!email) return null
  return crypto.createHash('sha256').update(email.toLowerCase().trim()).digest('hex')
}

async function syncAllUsers() {
  console.log('🔄 Starting Whitelist Sync...')

  // 1. ดึงข้อมูล User ทั้งหมดจากโปรไฟล์
  const { data: profiles, error } = await supabase
    .from('user_profiles')
    .select('email')
  
  if (error) {
    console.error('❌ Error:', error.message)
    return
  }

  console.log(`📋 Found ${profiles.length} users to sync.`)

  const whitelistData = profiles
    .filter(p => p.email && p.email !== 'admin_dtt@dowa-tht.co.th') // บล็อก admin_dtt ตั้งแต่ตรงนี้เลย
    .map(p => ({
      email_hash: hashEmail(p.email)
    }))

  // 2. ส่งข้อมูลไปที่ตาราง user_whitelist (Upsert เพื่อไม่ให้ซ้ำ)
  const { error: syncError } = await supabase
    .from('user_whitelist')
    .upsert(whitelistData, { onConflict: 'email_hash' })

  if (syncError) {
    console.error('❌ Sync Error:', syncError.message)
    if (syncError.message.includes('relation "user_whitelist" does not exist')) {
        console.error('👉 อย่าลืมรัน SQL ใน Supabase SQL Editor เพื่อสร้างตารางก่อนนะครับ!')
    }
  } else {
    console.log('✅ Whitelist Sync Complete! ทุกคนได้รับตราประทับลับเรียบร้อยแล้ว')
  }
}

syncAllUsers()
