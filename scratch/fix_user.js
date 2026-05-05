const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fixDatabaseAndUser() {
  const email = 'natthawut@dowa-tht.co.th'
  const userId = '7ad17b8b-c877-4a18-b9c6-bbdd8fb22c30'

  console.log('🛠️ Fixing database schema...')
  
  // 1. เพิ่ม column email (ถ้ายังไม่มี)
  try {
    // ใช้ rpc หรือ query ตรงๆ ไม่ได้ถ้าไม่มีสิทธิ์ แต่เราสามารถลอง Insert เพื่อดูว่า column มีไหม 
    // หรือใช้ SQL ผ่าน API (ถ้าเปิดไว้) 
    // ในเคสนี้ผมจะใช้การ Insert แบบ Upsert โดยระบุ ID ที่มีอยู่แล้ว
    
    // แต่เดี๋ยวก่อน! ผมควรลองเพิ่มชื่อคุณเข้าไปก่อนโดยไม่ใส่ email (เพราะ id เป็น PK อยู่แล้ว)
    console.log(`🚀 Adding user ${email} to user_profiles...`)
    
    const { error: insertError } = await supabase
      .from('user_profiles')
      .upsert({
        id: userId,
        full_name: 'Natthawut Hapang',
        role: 'superuser', // ใช้คำเดิมเพื่อให้ผ่าน Check Constraint ของ DB
        is_active: true,
        can_be_assignee: true
      })

    if (insertError) {
      console.error('❌ Insert Error:', insertError.message)
    } else {
      console.log('✅ User successfully added to user_profiles!')
    }

  } catch (err) {
    console.error('💥 Fatal Error:', err.message)
  }
}

fixDatabaseAndUser()
