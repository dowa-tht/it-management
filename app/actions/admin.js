'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath, unstable_noStore as noStore } from 'next/cache'
import { hashEmail } from '@/lib/auth'
import { randomBytes, randomUUID } from 'crypto'

/**
 * 🚀 ยกระดับการสร้าง User เป็นระบบ Unified Auth (Supabase Auth 100%)
 */
export async function createAdminUser({ email, password, full_name, role, can_be_assignee, sendEmailInvite = true }) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const isInviteOnly = !password;
    const finalPassword = password || randomBytes(16).toString('hex');

    // 1. นำสิทธิ์มาทำความสะอาด (Normalization)
    const normalizedRole = (role === 'administrator' || role === 'superuser') ? 'administrator' : 
                           (role === 'supervisor') ? 'supervisor' : 
                           (role === 'member' || role === 'user') ? 'member' : role

    // 2. สร้าง User ใน Supabase Auth
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password: finalPassword,
      email_confirm: true,
      user_metadata: { full_name, role: normalizedRole }
    })
    
    if (authError) {
      console.error('Auth Creation Error:', authError)
      throw new Error(`Auth Error: ${authError.message}`)
    }

    const userId = authData.user.id

    // 🛡️ 2.1 เพิ่มตราประทับลับในทะเบียนขาว (Double-Lock Whitelist)
    // มาตรฐาน: บันทึก SHA-256 Hash ของอีเมล
    const emailHash = hashEmail(email)
    const { error: whitelistError } = await adminClient
      .from('user_whitelist')
      .upsert({ email_hash: emailHash }, { onConflict: 'email_hash' })
    
    if (whitelistError) {
      console.error('Whitelist Error:', whitelistError)
      throw new Error(`Whitelist Error: ${whitelistError.message}`)
    }

    // 2.2 Calculate Expiry for Guest
    let expiresAt = null
    if (normalizedRole === 'guest') {
      const d = new Date()
      d.setDate(d.getDate() + 3) // 3 Days
      expiresAt = d.toISOString()
    }

    // 2.3 Onboarding Token
    const onboardingToken = randomUUID()

    // 3. บันทึกข้อมูลลงใน user_profiles (Source of Truth)
    const { error: profileError } = await adminClient.from('user_profiles').upsert({
      id: userId,
      full_name,
      email: email,
      role: normalizedRole,
      is_active: true,
      can_be_assignee: can_be_assignee || false,
      force_password_change: true,
      is_onboarded: false,
      onboarding_token: onboardingToken,
      expires_at: expiresAt
    }, { onConflict: 'id' })

    if (profileError) {
      console.error('Profile Error:', profileError)
      throw new Error(`Profile Error: ${profileError.message}`)
    }

    // 4. ส่ง Email ตามเงื่อนไข
    if (sendEmailInvite) {
      try {
        const { sendEmail } = await import('@/lib/resend')
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
        const setupUrl = `${siteUrl}/onboarding?token=${onboardingToken}`

        let emailHtml = '';
        if (isInviteOnly) {
          // Path A: Invite
          emailHtml = `
            <div style="font-family: sans-serif; padding: 40px; background-color: #f8fafc;">
              <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; padding: 40px; border: 1px solid #e2e8f0;">
                <h2 style="color: #1d4ed8; margin-top: 0;">ยินดีต้อนรับสู่ DOWA IT System</h2>
                <p>สวัสดีคุณ <strong>${full_name}</strong>,</p>
                <p>คุณได้รับเชิญให้เข้าใช้งานระบบบริหารจัดการไอทีของ DOWA</p>
                <p style="margin: 24px 0;">กรุณากดปุ่มด้านล่างเพื่อทำการลงทะเบียน ตั้งค่ารหัสผ่าน และ Signature PIN ของคุณ:</p>
                <div style="text-align: center;">
                  <a href="${setupUrl}" style="display: inline-block; padding: 14px 28px; background-color: #1d4ed8; color: white; text-decoration: none; border-radius: 10px; font-weight: bold;">ลงทะเบียนเข้าใช้งาน (Self-Registration)</a>
                </div>
                <p style="font-size: 12px; color: #64748b; margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 20px;">
                  * ลิงก์นี้มีอายุ 24 ชั่วโมง
                </p>
              </div>
            </div>
          `;
        } else {
          // Path B: Manual Credentials
          emailHtml = `
            <div style="font-family: sans-serif; padding: 40px; background-color: #f8fafc;">
              <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; padding: 40px; border: 1px solid #e2e8f0;">
                <h2 style="color: #1d4ed8; margin-top: 0;">ข้อมูลการเข้าใช้งาน DOWA IT System</h2>
                <p>สวัสดีคุณ <strong>${full_name}</strong>,</p>
                <p>บัญชีของคุณถูกสร้างเรียบร้อยแล้ว โดยมีข้อมูลการเข้าใช้งานดังนี้:</p>
                <div style="background-color: #f1f5f9; padding: 20px; border-radius: 12px; margin: 24px 0;">
                  <p style="margin: 0; font-size: 14px;"><strong>อีเมล:</strong> ${email}</p>
                  <p style="margin: 8px 0 0 0; font-size: 14px;"><strong>รหัสผ่าน:</strong> ${password}</p>
                </div>
                <div style="text-align: center;">
                  <a href="${setupUrl}" style="display: inline-block; padding: 14px 28px; background-color: #1d4ed8; color: white; text-decoration: none; border-radius: 10px; font-weight: bold;">เข้าสู่ระบบและตั้งค่าความปลอดภัย</a>
                </div>
                <p style="font-size: 12px; color: #dc2626; margin-top: 24px;">* เมื่อเข้าสู่ระบบครั้งแรก ระบบจะบังคับให้คุณเปลี่ยนรหัสผ่านเพื่อความปลอดภัย</p>
              </div>
            </div>
          `;
        }

        await sendEmail({
          to: [email],
          subject: isInviteOnly ? '[DOWA IT] ขอเชิญลงทะเบียนเข้าใช้งานระบบ' : '[DOWA IT] ข้อมูลการเข้าใช้งานระบบของคุณ',
          html: emailHtml
        })
      } catch (e) {
        console.error('Email sending failed:', e)
      }
    }

    revalidatePath('/dashboard/settings/users')
    return { success: true }
  } catch (err) {
    console.error('createAdminUser error:', err)
    return { success: false, error: err.message }
  }
}

/**
 * 📋 ดึงข้อมูลผู้ใช้จาก Source of Truth เดียว (user_profiles)
 */
export async function getAdminUsers() {
  noStore()
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const adminClient = createClient(supabaseUrl, supabaseServiceKey)

    const { data: profiles, error } = await adminClient
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    return { success: true, data: profiles }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

/**
 * 🛠️ อัปเดตข้อมูลผู้ใช้
 */
export async function updateAdminUser({ id, email, full_name, role, can_be_assignee, is_active }) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    await adminClient.auth.admin.updateUserById(id, {
      user_metadata: { full_name, role }
    })

    const { error } = await adminClient.from('user_profiles').update({
      full_name,
      role,
      can_be_assignee,
      is_active
    }).eq('id', id)

    if (error) throw error

    revalidatePath('/dashboard/settings/users')
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

/**
 * 🔐 อัปเดตรหัสผ่าน
 */
export async function updateAdminUserPassword(userId, newPassword) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const { error } = await adminClient.auth.admin.updateUserById(userId, {
      password: newPassword
    })

    if (error) throw error

    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

/**
 * 🗑️ ลบผู้ใช้อย่างหมดจด
 */
export async function cleanDeleteUser(email) {
  return secureCleanDeleteUser(email, `DELETE-${email}`)
}

/**
 * 🗑️ ลบผู้ใช้อย่างหมดจด พร้อมระบบยืนยันความปลอดภัย
 */
export async function secureCleanDeleteUser(email, confirmationText) {
  try {
    if (confirmationText !== `DELETE-${email}`) {
      throw new Error('ข้อความยืนยันไม่ถูกต้อง กรุณาพิมพ์ DELETE-[อีเมล] เพื่อยืนยัน')
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const { data: profile } = await adminClient.from('user_profiles').select('id, email').eq('email', email).single()
    if (!profile) throw new Error('User not found')

    // 🛡️ ลบตราประทับลับออกจาก Whitelist
    const emailHash = hashEmail(email)
    await adminClient.from('user_whitelist').delete().eq('email_hash', emailHash)

    await adminClient.from('user_profiles').delete().eq('id', profile.id)
    await adminClient.auth.admin.deleteUser(profile.id)

    revalidatePath('/dashboard/settings/users')
    return { success: true }
  } catch (err) {
    console.error('cleanDeleteUser error:', err)
    return { success: false, error: err.message }
  }
}

/**
 * 🆔 ตรวจสอบ Identities (SSO) ของผู้ใช้
 */
export async function getUserIdentities(userId) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const adminClient = createClient(supabaseUrl, supabaseServiceKey)

    const { data: { user }, error } = await adminClient.auth.admin.getUserById(userId)
    if (error) throw error

    return { success: true, identities: user.identities || [] }
  } catch (err) {
    console.error('getUserIdentities error:', err)
    return { success: false, error: err.message }
  }
}

/**
 * 🔒 อัปเดต Signature PIN โดย Admin
 */
export async function updateAdminUserPin(userId, newPin) {
  try {
    const bcrypt = await import('bcryptjs')
    const hashedPin = await bcrypt.hash(newPin, 10)
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const adminClient = createClient(supabaseUrl, supabaseServiceKey)

    const { error } = await adminClient.from('user_profiles').update({
      signature_pin: hashedPin,
      pin_attempts: 0,
      pin_locked_until: null
    }).eq('id', userId)

    if (error) throw error
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

/**
 * 🔓 ปลดล็อค PIN (Clear Attempts/Lockout)
 */
export async function unlockUserPin(userId) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const adminClient = createClient(supabaseUrl, supabaseServiceKey)

    const { error } = await adminClient.from('user_profiles').update({
      pin_attempts: 0,
      pin_locked_until: null
    }).eq('id', userId)

    if (error) throw error
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
}
