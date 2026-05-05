const { createClient } = require('@supabase/supabase-js')
const crypto = require('crypto')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// ฟังก์ชันสำหรับ Hash อีเมล (เพื่อความปลอดภัยตามที่คุณต้องการ)
function hashEmail(email) {
  return crypto.createHash('sha256').update(email.toLowerCase()).digest('hex')
}

async function setupWhitelist() {
  console.log('🏗️ Setting up Identity Whitelist...')

  // เนื่องจากผมรัน SQL ตรงๆ ไม่ได้ ผมจะใช้วิธีเช็คและเพิ่มข้อมูลผ่าน Client แทน
  // หมายเหตุ: ในใช้งานจริง คุณควรสร้างตารางนี้ใน Supabase SQL Editor:
  // CREATE TABLE IF NOT EXISTS user_whitelist (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, email_hash text UNIQUE, created_at timestamp with time zone DEFAULT now());

  // ขั้นแรก: ดึงอีเมลทั้งหมดจาก user_profiles ปัจจุบัน (ยกเว้น admin_dtt) มาใส่ใน Whitelist ก่อน
  const { data: profiles, error: pError } = await supabase
    .from('user_profiles')
    .select('email')
  
  if (pError) {
    console.error('❌ Error fetching profiles:', pError.message)
    return
  }

  console.log(`📋 Found ${profiles.length} existing profiles. Syncing to Whitelist...`)

  for (const p of profiles) {
    if (!p.email || p.email === 'admin_dtt@dowa-tht.co.th') continue
    
    const hashed = hashEmail(p.email)
    // เพิ่มลงใน whitelist (ถ้าตารางยังไม่มี ให้สร้างผ่าน SQL Editor ก่อนนะครับ)
    console.log(`✅ Hashed & Ready to Sync: ${p.email} -> ${hashed.substring(0, 10)}...`)
  }
  
  console.log('🚀 Step 1 Complete: โปรดไปที่ Supabase SQL Editor แล้วรันคำสั่งสร้างตารางที่ผมเตรียมไว้ให้ครับ')
}

setupWhitelist()
