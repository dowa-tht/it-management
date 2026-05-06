'use server'
import { createClient } from '@supabase/supabase-js'
import { getCurrentUserSession } from './user'
import { sendEmail } from '@/lib/resend'
import { randomUUID } from 'crypto'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export async function searchUsers(query) {
  try {
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
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

export async function quickAddUser({ fullName, email, role = 'member' }) {
  try {
    const session = await getCurrentUserSession()
    if (!session) return { error: 'Unauthorized' }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

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

    // Insert new profile
    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .insert({
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
        force_password_change: true
      })
      .select()
      .single()

    if (error) throw error

    // Send Welcome Email if email exists
    if (email) {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
      const setupUrl = `${siteUrl}/onboarding?token=${onboardingToken}`

      await sendEmail({
        to: email,
        subject: '[DOWA IT] ยินดีต้อนรับและยืนยันตัวตนเพื่อเข้าใช้งานระบบ',
        html: `
          <div style="font-family: sans-serif; padding: 40px; color: #1e293b; background-color: #f8fafc;">
            <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
              <h2 style="color: #1d4ed8; margin-top: 0;">ยินดีต้อนรับเข้าสู่ DOWA IT System</h2>
              <p>สวัสดีคุณ <strong>${fullName}</strong>,</p>
              <p>บัญชีของคุณถูกสร้างขึ้นในระบบเรียบร้อยแล้ว กรุณาใช้ข้อมูลด้านล่างในการยืนยันตัวตน:</p>
              
              <div style="background-color: #eff6ff; padding: 24px; border-radius: 12px; margin: 24px 0; text-align: center;">
                <div style="font-size: 14px; color: #1e40af; margin-bottom: 8px; font-weight: bold;">รหัส OTP สำหรับเซ็นชื่อเอกสาร (มีอายุ 30 นาที)</div>
                <div style="font-size: 32px; font-weight: 800; color: #1d4ed8; letter-spacing: 4px;">${otp}</div>
              </div>

              <p style="margin-top: 32px;">กรุณากดปุ่มด้านล่างเพื่อทำการลงทะเบียนและตั้งค่าความปลอดภัย (รหัสผ่าน และ Signature PIN) เพื่อเข้าใช้งานระบบอย่างเต็มรูปแบบ:</p>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${setupUrl}" style="display: inline-block; padding: 14px 28px; background-color: #1d4ed8; color: white; text-decoration: none; border-radius: 10px; font-weight: bold;">ตั้งค่าบัญชี (Self-Registration)</a>
              </div>
              
              <p style="font-size: 12px; color: #64748b; border-top: 1px solid #f1f5f9; padding-top: 20px;">
                * ลิงก์สำหรับการลงทะเบียนนี้มีอายุ 24 ชั่วโมง<br/>
                หากคุณไม่ได้เป็นผู้ขอใช้งานระบบนี้ กรุณาแจ้งฝ่าย IT ทันที
              </p>
            </div>
          </div>
        `
      })
    }

    return { data }
  } catch (err) {
    console.error('quickAddUser Error:', err)
    return { error: err.message }
  }
}

export async function requestSignatureOTP(userId) {
  try {
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    
    // Check user and email
    const { data: user, error: fetchErr } = await supabaseAdmin
      .from('user_profiles')
      .select('id, email, full_name')
      .eq('id', userId)
      .single()
    
    if (fetchErr || !user) throw new Error('ไม่พบข้อมูลผู้ใช้')
    if (!user.email) throw new Error('ผู้ใช้นี้ไม่มีข้อมูลอีเมลสำหรับการส่ง OTP')

    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const otpExpires = new Date(Date.now() + 30 * 60 * 1000).toISOString()

    const { error: updateErr } = await supabaseAdmin
      .from('user_profiles')
      .update({
        otp_code: otp,
        otp_expires_at: otpExpires,
        otp_attempts: 0
      })
      .eq('id', userId)

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

    return { success: true }
  } catch (err) {
    return { error: err.message }
  }
}

export async function verifySignatureOTP(userId, code) {
  try {
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    
    const { data: user, error: fetchErr } = await supabaseAdmin
      .from('user_profiles')
      .select('otp_code, otp_expires_at, otp_attempts')
      .eq('id', userId)
      .single()

    if (fetchErr || !user) throw new Error('ไม่พบข้อมูลผู้ใช้')
    
    if (user.otp_attempts >= 5) throw new Error('คุณกรอกรหัสผิดเกินจำนวนครั้งที่กำหนด กรุณาขอรหัสใหม่')
    
    if (!user.otp_code || user.otp_code !== code) {
      await supabaseAdmin.from('user_profiles').update({ otp_attempts: (user.otp_attempts || 0) + 1 }).eq('id', userId)
      throw new Error('รหัส OTP ไม่ถูกต้อง')
    }

    const expiresAt = new Date(user.otp_expires_at)
    if (expiresAt < new Date()) throw new Error('รหัส OTP หมดอายุแล้ว กรุณาขอรหัสใหม่')

    // OTP Verified! Clear it
    await supabaseAdmin.from('user_profiles').update({ otp_code: null, otp_attempts: 0 }).eq('id', userId)

    return { success: true }
  } catch (err) {
    return { error: err.message }
  }
}

export async function verifyMemberPIN(userId, pin) {
  try {
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .select('signature_pin')
      .eq('id', userId)
      .single()

    if (error || !data) return { success: false, error: 'ไม่พบข้อมูลผู้ใช้' }
    if (data.signature_pin !== pin) return { success: false, error: 'PIN ไม่ถูกต้อง' }

    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
}
