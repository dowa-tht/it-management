'use server'
import { createClient } from '@supabase/supabase-js'
import { getCurrentUserSession } from './user'
import { sendEmail } from '@/lib/resend'
import { buildOnboardingInviteEmail } from '@/lib/emailTemplates'
import { buildPublicBaseUrl } from '@/lib/publicBaseUrl'
import { randomUUID } from 'crypto'
import bcrypt from 'bcryptjs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export async function searchUsers(query) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .select('id, full_name, email, role')
      .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
      .order('full_name', { ascending: true })
      .limit(10)

    if (error) throw error
    return { data }
  } catch (err) {
    console.error('searchUsers Error:', err)
    return { error: err.message }
  }
}

export async function quickAddUser({ fullName, email, role = 'employee' }) {
  try {
    return { error: 'Quick Add แบบสร้างบัญชีถาวรถูกปิดใช้งานแล้ว' }
    const session = await getCurrentUserSession()
    if (!session) return { error: 'Unauthorized' }

    const supabaseAdmin = getSupabaseAdmin()

    // Check if user already exists
    const { data: existing } = await supabaseAdmin
      .from('user_profiles')
      .select('id, email')
      .eq('full_name', fullName)
      .maybeSingle()

    if (existing) return { error: 'ชื่อนี้มีอยู่ในระบบแล้ว' }
    
    // Generate OTP (6 digits) and Onboarding Token
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const otpExpires = new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 mins
    const onboardingToken = randomUUID()
    const onboardingExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours

    // 1. Prepare Auth Account (Supabase Auth is required for foreign key)
    const finalEmail = email || `${randomUUID()}@dowa-it.local`
    const tempPassword = randomUUID() // Random password for quick added users
    
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: finalEmail,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: fullName, role: role }
    })

    if (authError) throw authError
    const userId = authData.user.id

    // 2. Insert new profile linked to Auth
    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .insert({
        id: userId,
        full_name: fullName,
        email: email || null,
        role: role,
        signature_pin: null, // No default PIN
        is_active: true,
        can_be_assignee: false,
        is_onboarded: false,
        otp_code: otp,
        otp_expires_at: otpExpires,
        onboarding_token: onboardingToken,
        onboarding_token_expires: onboardingExpires,
        force_password_change: true
      })
      .select()
      .single()

    if (error) throw error

    // 🛡️ 3. Sync Whitelist (เพื่อให้เข้าใช้งานได้ทันที)
    const { hashEmail } = await import('@/lib/auth')
    const emailHash = hashEmail(finalEmail)
    await supabaseAdmin.from('user_whitelist').insert([{ email_hash: emailHash }])

    // Send Welcome Email if email exists
    if (email) {
      const setupUrl = `${buildPublicBaseUrl()}/onboarding?token=${onboardingToken}`

      await sendEmail({
        to: email,
        subject: '[DOWA IT] ยินดีต้อนรับและยืนยันตัวตนเพื่อเข้าใช้งานระบบ',
        html: buildOnboardingInviteEmail({
          fullName,
          setupUrl,
          isInviteOnly: true,
        })
      })
    }

    return { data }
  } catch (err) {
    console.error('quickAddUser Error:', err)
    return { error: err.message }
  }
}

export async function requestEmployeeSignatureOTP(userId) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    
    // Check user and email
    let user;
    let fetchErr;

    // Try finding by UUID first
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)
    if (isUUID) {
      const { data, error } = await supabaseAdmin
        .from('user_profiles')
        .select('id, email, full_name')
        .eq('id', userId)
        .maybeSingle()
      user = data;
      fetchErr = error;
    }

    // If not found by ID, try finding by matching email
    if (!user && userId) {
      const { data, error } = await supabaseAdmin
        .from('user_profiles')
        .select('id, email, full_name')
        .eq('email', userId)
        .maybeSingle()
      user = data;
      fetchErr = error;
    }

    if (fetchErr || !user) throw new Error('ไม่พบข้อมูลผู้ใช้ในระบบ')
    if (!user.email) throw new Error('ผู้ใช้ท่านนี้ไม่มีอีเมลสำหรับการรับ OTP')

    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const otpExpires = new Date(Date.now() + 30 * 60 * 1000).toISOString()

    const { error: updateErr } = await supabaseAdmin
      .from('user_profiles')
      .update({
        otp_code: otp,
        otp_expires_at: otpExpires,
        otp_attempts: 0
      })
      .eq('id', user.id)

    if (updateErr) throw updateErr

    await sendEmail({
      to: user.email,
      subject: '[DOWA IT] รหัส OTP สำหรับเซ็นชื่อในเอกสาร',
      html: `
        <div style="font-family: sans-serif; padding: 32px; background-color: #f8fafc;">
          <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; padding: 32px; border: 1px solid #e2e8f0;">
            <h3 style="color: #0f172a; margin-top: 0;">รหัสยืนยันการลงนาม (OTP)</h3>
            <p style="font-size: 14px; color: #475569;">สวัสดีคุณ ${user.full_name},</p>
            <p style="font-size: 14px; color: #475569;">คุณกำลังดำเนินการเซ็นชื่อในเอกสาร Incident/Checklist กรุณาใช้รหัสด้านล่าง:</p>
            <div style="background: #f1f5f9; padding: 20px; text-align: center; border-radius: 10px; margin: 24px 0;">
              <span style="font-size: 32px; font-weight: 800; color: #1d4ed8; letter-spacing: 4px;">${otp}</span>
            </div>
            <p style="font-size: 12px; color: #94a3b8;">รหัสนี้จะหมดอายุภายใน 30 นาที</p>
          </div>
        </div>
      `
    })

    return { success: true, email: user.email }
  } catch (err) {
    return { error: err.message }
  }
}

export async function verifyEmployeeSignatureOTP(userId, code) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    
    let user;
    let fetchErr;

    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)
    if (isUUID) {
      const { data, error } = await supabaseAdmin
        .from('user_profiles')
        .select('id, otp_code, otp_expires_at, otp_attempts')
        .eq('id', userId)
        .maybeSingle()
      user = data;
      fetchErr = error;
    }

    if (!user && userId) {
      const { data, error } = await supabaseAdmin
        .from('user_profiles')
        .select('id, otp_code, otp_expires_at, otp_attempts')
        .eq('email', userId)
        .maybeSingle()
      user = data;
      fetchErr = error;
    }

    if (fetchErr || !user) throw new Error('ไม่พบข้อมูลผู้ใช้')
    
    // Use user.id (UUID) for subsequent updates
    const realId = user.id
    
    if (user.otp_attempts >= 5) throw new Error('คุณกรอกรหัสผิดเกินจำนวนครั้งที่กำหนด กรุณาขอรหัสใหม่')
    
    if (!user.otp_code || user.otp_code !== code) {
      await supabaseAdmin.from('user_profiles').update({ otp_attempts: (user.otp_attempts || 0) + 1 }).eq('id', realId)
      throw new Error('รหัส OTP ไม่ถูกต้อง')
    }

    const expiresAt = new Date(user.otp_expires_at)
    if (expiresAt < new Date()) throw new Error('รหัส OTP หมดอายุแล้ว กรุณาขอรหัสใหม่')

    // OTP Verified! Clear it
    await supabaseAdmin.from('user_profiles').update({ otp_code: null, otp_attempts: 0 }).eq('id', realId)

    return { success: true }
  } catch (err) {
    return { error: err.message }
  }
}

import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

export async function verifyEmployeePIN(userId, pin) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    
    let user;
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)
    
    // 1. Try by UUID (most reliable — standard per DEVELOPMENT.md §6)
    if (isUUID) {
      const { data } = await supabaseAdmin
        .from('user_profiles')
        .select('signature_pin')
        .eq('id', userId)
        .maybeSingle()
      user = data
    }

    // 2. Try by email (fallback if UUID not available)
    if (!user && userId) {
      const { data } = await supabaseAdmin
        .from('user_profiles')
        .select('signature_pin')
        .eq('email', userId)
        .maybeSingle()
      user = data
    }

    // NOTE: full_name fallback intentionally removed — violates ZERO_HACK_POLICY & DEVELOPMENT.md §6
    // Root fix: incidents.reported_by_id column must be populated at insert time

    const isValid = await bcrypt.compare(pin, user.signature_pin)
    
    if (!isValid) return { success: false, error: 'PIN ไม่ถูกต้อง' }

    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
}
