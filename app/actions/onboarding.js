'use server'

import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

/**
 * 🎫 ตรวจสอบ Token สำหรับการทำ Onboarding
 */
export async function validateOnboardingToken(token) {
  if (!token) return { error: 'Token is required' }
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const { data, error } = await supabase
    .from('user_profiles')
    .select('id, full_name, email, role, is_onboarded, created_at')
    .eq('onboarding_token', token)
    .single()

  if (error || !data) return { error: 'Link ไม่ถูกต้องหรือหมดอายุแล้ว' }
  
  // 🛡️ Check Expiry (Onboarding Link valid for 24 Hours from user profile creation)
  const isExpired = data.created_at && (new Date() - new Date(data.created_at) > 24 * 60 * 60 * 1000)
  if (isExpired) {
    return { error: 'Link หมดอายุแล้ว กรุณาติดต่อ Admin หรือเข้าสู่ระบบด้วยรหัสผ่านเพื่อขอรับ Link ใหม่' }
  }
  if (data.is_onboarded) return { error: 'บัญชีนี้ได้รับการลงทะเบียนเรียบร้อยแล้ว' }

  return { success: true, user: data }
}

/**
 * 🚀 ดำเนินการ Onboarding (Step 2 & 3)
 */
export async function completeOnboarding({ token, password, pin }) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // 1. Validate Token again
    const { data: profile, error: findError } = await supabase
      .from('user_profiles')
      .select('id, email, onboarding_token')
      .eq('onboarding_token', token)
      .single()

    if (findError || !profile) throw new Error('Token ไม่ถูกต้อง')

    // 2. Update Password in Supabase Auth (ข้ามหากระบุมาเป็นค่าว่าง - กรณีเปลี่ยนรหัสผ่านไปแล้ว)
    if (password) {
      const { error: authError } = await supabase.auth.admin.updateUserById(profile.id, {
        password: password
      })
      if (authError) throw authError
    }

    // 3. Hash and Update PIN
    const salt = await bcrypt.genSalt(10)
    const pinHash = await bcrypt.hash(pin, salt)

    // 4. Update Profile
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        signature_pin: pinHash,
        is_onboarded: true,
        onboarding_token: null, // Clear token
        force_password_change: false,
        is_active: true
      })
      .eq('id', profile.id)

    if (updateError) throw updateError

    // 🛡️ อัปเดต Cookie เมื่อ Onboarding สำเร็จ
    const cookieStore = await cookies()
    cookieStore.set('dowa_onboarded', 'true', {
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    })

    return { success: true }
  } catch (err) {
    console.error('completeOnboarding error:', err)
    return { error: err.message }
  }
}
