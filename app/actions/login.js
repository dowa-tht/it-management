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
  const userId = authData.user.id
  
  // 🛡️ เช็คสถานะ Onboarding และจัดการ Token (Gatekeeper Standard)
  const onboarding = await checkOnboardingInternal(userId, adminClient)

  // 📝 บันทึก Login Log
  await adminClient.from('login_logs').insert([{
    user_id: userId,
    user_email: email,
    action: 'Login สำเร็จ',
    ip_address: 'SERVER_SIDE',
    user_agent: 'Unified Login'
  }])

  // 🛡️ ตั้งค่า Cookie สำหรับ Onboarding (Gatekeeper Standard - Cookie based)
  const cookieStore = await cookies()
  cookieStore.set('dowa_onboarded', (!onboarding.needs_onboarding).toString(), {
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  })

  return { 
    success: true,
    needs_onboarding: onboarding.needs_onboarding,
    onboarding_token: onboarding.onboarding_token
  }
}

/**
 * 🛠️ Helper สำหรับตรวจสอบ Onboarding และ Auto-Refresh Token
 * (ใช้ร่วมกันทั้ง Unified Login และ Gatekeeper Status)
 */
async function checkOnboardingInternal(userId, adminClient) {
  const { data: profile } = await adminClient
    .from('user_profiles')
    .select('is_onboarded, onboarding_token, onboarding_token_expires')
    .eq('id', userId)
    .single()

  if (!profile || profile.is_onboarded) {
    return { needs_onboarding: false, onboarding_token: null }
  }

  // Auto-Refresh Logic
  const isExpired = profile.onboarding_token_expires && new Date(profile.onboarding_token_expires) < new Date()
  let finalToken = profile.onboarding_token

  if (!finalToken || isExpired) {
    const { randomUUID } = await import('crypto')
    finalToken = randomUUID()
    const newExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    
    await adminClient
      .from('user_profiles')
      .update({ 
        onboarding_token: finalToken, 
        onboarding_token_expires: newExpires 
      })
      .eq('id', userId)
  }

  return { 
    needs_onboarding: true,
    onboarding_token: finalToken
  }
}

/**
 * 🕵️ ตรวจสอบสถานะ Onboarding สำหรับ Gatekeeper
 */
export async function getOnboardingStatus() {
  const cookieStore = await cookies()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
      }
    }
  })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { needs_onboarding: false, session: false }

  const adminClient = await import('@supabase/supabase-js').then(m => m.createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY))
  const onboarding = await checkOnboardingInternal(user.id, adminClient)

  return { 
    session: true,
    needs_onboarding: onboarding.needs_onboarding,
    onboarding_token: onboarding.onboarding_token
  }
}
