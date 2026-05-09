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
    let { userId, email } = await req.json()

    console.log(`🛡️ Cleanup API: Verifying user ${email} (ID: ${userId})`)

    if (!userId) {
      return NextResponse.json({ error: 'Missing User ID' }, { status: 400 })
    }

    // 💡 ถ้า email ไม่ส่งมา ให้ลองดึงจาก Auth Admin โดยตรง (ป้องกันเคส SSO email missing)
    if (!email) {
      const { data: { user }, error: getErr } = await supabaseAdmin.auth.admin.getUserById(userId)
      if (user) email = user.email
    }

    if (!email) {
      console.error('❌ Cleanup API: Email still missing for user:', userId)
      return NextResponse.json({ authorized: false, message: 'Email not found in session or provider' })
    }

    // 👑 MASTER BYPASS: ปลดล็อคพิเศษสำหรับ Admin เพื่อกู้คืนระบบ
    if (email.toLowerCase() === 'admin@dowa-tht.co.th') {
      console.log('👑 Master Bypass: Administrator access granted.')
      
      // ตรวจสอบ/สร้าง Profile อัตโนมัติสำหรับ Admin
      const { data: profile } = await supabaseAdmin.from('user_profiles').select('id').eq('id', userId).maybeSingle()
      if (!profile) {
        await supabaseAdmin.from('user_profiles').insert([{
          id: userId,
          email: email,
          full_name: 'Dowa Admin',
          role: 'admin',
          is_active: true
        }])
      }
      
      return NextResponse.json({ authorized: true, message: 'Welcome back, Administrator' })
    }

    // 🕵️‍♂️ ตรวจสอบด่านที่สอง: เช็คที่ทะเบียนขาวลับ (Double-Lock Whitelist)
    const emailHash = hashEmail(email)
    const { data: whitelistEntry, error: wError } = await supabaseAdmin
      .from('user_whitelist')
      .select('id')
      .eq('email_hash', emailHash)
      .maybeSingle()

    // ❌ ถ้าไม่พบในทะเบียนขาว
    if (!whitelistEntry || wError) {
      console.log(`⚠️ Double-Lock Warning: ${email} is NOT in Whitelist.`)
      
      // 🛡️ [DISABLED PURGE FOR SAFETY] 
      // เราจะไม่ลบ Account อัตโนมัติ เพื่อป้องกัน False Positive
      /*
      console.log('🛡️ Purge logic triggered but bypassed for investigation.')
      await supabaseAdmin.from('user_profiles').delete().eq('id', userId)
      await supabaseAdmin.auth.admin.deleteUser(userId)
      */
      
      return NextResponse.json({ authorized: false, message: 'อีเมลนี้ยังไม่ได้รับอนุญาต (Not in Whitelist)' })
    }

    // ✅ ตรวจสอบว่ามี Profile หรือยัง (ถ้าไม่มีให้สร้าง)
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle()
    
    if (!profile) {
      console.log('📝 Cleanup API: Auto-creating missing profile for whitelisted user...')
      await supabaseAdmin.from('user_profiles').insert([{
        id: userId,
        email: email,
        full_name: email.split('@')[0],
        role: 'auditor',
        is_active: true
      }])
    }

    return NextResponse.json({ authorized: true, message: 'User is authorized' })
  } catch (err) {
    console.error('💥 Cleanup API Fatal Error:', err.message)
    // ในกรณีที่ระบบหลังบ้านล่ม เรายอมให้ผ่านไปก่อน (Failsafe) เพื่อไม่ให้ User เข้าไม่ได้
    return NextResponse.json({ authorized: true, message: 'Authorized by failsafe' })
  }
}
