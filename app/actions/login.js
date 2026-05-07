'use server'

import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

/**
 * 🔑 ระบบ Login ตัวเดียวสำหรับทุกคน (Unified Login)
 * รองรับทั้ง Administrator, Supervisor, Approval และ Guest
 */
export async function unifiedLogin(email, password) {
  const cookieStore = await cookies()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    return { success: false, error: 'Missing Configuration' }
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
      }
    }
  })

  // พยายาม Login ด้วย Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password
  })

  if (authError) {
    return { success: false, error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' }
  }

  // 🛡️ เช็คทะเบียนขาว (Whitelist) ทันทีหลัง Login
  const { createClient } = await import('@supabase/supabase-js')
  const { hashEmail } = await import('@/lib/auth')
  const adminClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  
  const hashedEmail = hashEmail(email)
  const { data: whitelistData } = await adminClient
    .from('user_whitelist')
    .select('id')
    .eq('email_hash', hashedEmail)
    .single()

  if (!whitelistData) {
    console.log(`🚫 Security: ${email} logged in but not in whitelist. Purging session...`)
    await supabase.auth.signOut()
    return { success: false, redirect_to_denied: true }
  }

  // ✅ Login สำเร็จและผ่านทะเบียนขาว
  
  // 🛡️ เช็คสถานะ Onboarding
  const { data: profile } = await adminClient
    .from('user_profiles')
    .select('is_onboarded')
    .eq('id', userId)
    .single()

  const needsOnboarding = profile && !profile.is_onboarded

  // 📝 บันทึก Login Log
  await adminClient.from('login_logs').insert([{
    user_id: userId,
    user_email: email,
    action: 'Login สำเร็จ',
    ip_address: 'SERVER_SIDE',
    user_agent: 'Unified Login'
  }])

  return { 
    success: true,
    needs_onboarding: needsOnboarding
  }
}
