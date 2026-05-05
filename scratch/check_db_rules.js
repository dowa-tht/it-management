const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkConstraint() {
  console.log('🔍 Investigating "user_profiles_role_check"...')

  // ดึงรายละเอียดของ Check Constraint จาก PostgreSQL
  const { data, error } = await supabase.rpc('get_raw_sql', { 
    sql_query: "SELECT check_clause FROM information_schema.check_constraints WHERE constraint_name = 'user_profiles_role_check'" 
  })

  if (error) {
    // ถ้าไม่มี RPC ให้ลอง Query ตรงๆ ผ่านตารางที่พอจะเข้าถึงได้
    console.log('⚠️ Could not use RPC. Trying alternative method...')
    const { data: raw, error: rawErr } = await supabase.from('user_profiles').select('role').limit(1)
    console.log('Current Role Example:', raw)
  } else {
    console.log('📜 Constraint Clause:', data)
  }
}

checkConstraint()
