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
    .select('id, full_name, email, role, is_onboarded')
    .eq('onboarding_token', token)
    .single()

  if (error || !data) return { error: 'Link ไม่ถูกต้องหรือหมดอายุแล้ว' }
  if (data.is_onboarded) return { error: 'บัญชีนี้ได้รับการลงทะเบียนเรียบร้อยแล้ว' }

  return { success: true, user: data }
}

/**
 * 🚀 ดำเนินการ Onboarding (Step 2 & 3)
 */
export async function completeOnboarding({ token, password, pin }) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    let profileId = null
    let profileEmail = null

    if (token) {
      // 1a. Validate by Token
      const { data: p, error: findError } = await supabase
        .from('user_profiles')
        .select('id, email, onboarding_token')
        .eq('onboarding_token', token)
        .single()

      if (findError || !p) throw new Error('Token ไม่ถูกต้อง')
      profileId = p.id
      profileEmail = p.email
    } else {
      // 1b. Validate by Session (Gatekeeper fallback)
      const { getCurrentUserSession } = await import('./user')
      const session = await getCurrentUserSession()
      
      if (!session || !session.user) throw new Error('เซสชันหมดอายุ กรุณาล็อกอินใหม่อีกครั้ง')
      
      const { data: p } = await supabase
        .from('user_profiles')
        .select('id, email')
        .eq('id', session.user.id)
        .single()
      
      if (!p) throw new Error('ไม่พบข้อมูลผู้ใช้')
      profileId = p.id
      profileEmail = p.email
    }

    // 2. Update Password in Supabase Auth (ข้ามหากระบุมาเป็นค่าว่าง - กรณีเปลี่ยนรหัสผ่านไปแล้ว)
    if (password) {
      const { error: authError } = await supabase.auth.admin.updateUserById(profileId, {
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
      .eq('id', profileId)

    if (updateError) throw updateError

    return { success: true }
  } catch (err) {
    console.error('completeOnboarding error:', err)
    return { error: err.message }
  }
}
