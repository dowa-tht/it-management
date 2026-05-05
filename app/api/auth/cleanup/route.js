import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// ใช้ Service Role Key เพื่อสิทธิ์ในการจัดการ User (ลบออก)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

import { hashEmail } from '@/lib/auth'

export async function POST(req) {
  try {
    const { userId, email } = await req.json()

    if (!userId || !email) {
      return NextResponse.json({ error: 'Missing data' }, { status: 400 })
    }

    // 🕵️‍♂️ ตรวจสอบด่านที่สอง: เช็คที่ทะเบียนขาวลับ (Double-Lock Whitelist)
    const emailHash = hashEmail(email)
    const { data: whitelistEntry, error: wError } = await supabaseAdmin
      .from('user_whitelist')
      .select('id')
      .eq('email_hash', emailHash)
      .single()

    // ❌ ถ้าไม่พบในทะเบียนขาว (หมายถึงเป็นคนนอกที่หลุดเข้ามา หรือถูกสร้างโดย Trigger)
    if (!whitelistEntry || wError) {
      console.log(`🛡️ Double-Lock Purge: ${email} is NOT in Whitelist. Purging now...`)
      
      // 1. ลบออกจากโปรไฟล์ก่อน (เพื่อความสะอาด)
      await supabaseAdmin.from('user_profiles').delete().eq('id', userId)
      
      // 2. ลบออกจาก Auth (ลบถาวร)
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)
      
      if (deleteError) {
        console.error('❌ Purge Error:', deleteError.message)
        return NextResponse.json({ error: deleteError.message }, { status: 500 })
      }

      console.log(`✅ Successfully purged intruder: ${email}`)
      return NextResponse.json({ authorized: false, message: 'Intruder purged' })
    }

    return NextResponse.json({ authorized: true, message: 'User is whitelisted' })
  } catch (err) {
    console.error('💥 Cleanup API Fatal Error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
