const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function repairUserProfiles() {
  console.log('🛠️ Repairing User Profiles...')

  // 1. ดึงข้อมูลจาก Supabase Auth (ซึ่งมีอีเมลที่ถูกต้อง)
  const { data: { users }, error: authError } = await supabase.auth.admin.listUsers()
  
  if (authError) {
    console.error('❌ Auth Error:', authError.message)
    return
  }

  console.log(`📋 Found ${users.length} users in Auth.`)

  for (const user of users) {
    console.log(`🔄 Syncing email for: ${user.email}`)
    
    // 2. อัปเดตอีเมลลงใน user_profiles โดยใช้ ID เป็นตัวเชื่อม
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({ email: user.email })
      .eq('id', user.id)

    if (updateError) {
      console.error(`❌ Failed for ${user.email}:`, updateError.message)
    }
  }

  console.log('✅ Repair Complete! ข้อมูลอีเมลในโปรไฟล์ได้รับการซ่อมแซมแล้ว')
}

repairUserProfiles()
