const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function purgeUnauthorized() {
  const email = 'admin_dtt@dowa-tht.co.th'
  console.log(`🧹 Purging unauthorized profile for: ${email}`)
  
  const { error } = await supabase
    .from('user_profiles')
    .delete()
    .eq('email', email)
    // หรือถ้า email column ยังไม่มี ให้ลบด้วย id ที่เราเห็นใน log
    // .eq('id', '630e20a6-ee43-4699-8dcb-d345304743e2')

  if (error) {
    console.error('❌ Delete Error:', error.message)
    // ลองลบด้วย ID แทนถ้า email column ไม่มี
    const { error: idError } = await supabase
      .from('user_profiles')
      .delete()
      .eq('id', '630e20a6-ee43-4699-8dcb-d345304743e2')
    
    if (idError) console.error('❌ ID Delete Error:', idError.message)
    else console.log('✅ Deleted by ID successfully!')
  } else {
    console.log('✅ Deleted by email successfully!')
  }
}

purgeUnauthorized()
