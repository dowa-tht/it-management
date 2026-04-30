'use server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import crypto from 'crypto'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const resend = new Resend(process.env.RESEND_API_KEY)

export async function requestRecovery(email) {
  try {
    if (!email) throw new Error('กรุณาระบุอีเมล')

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // 1. ตรวจสอบประเภทผู้ใช้จาก registry
    const { data: reg, error: regError } = await supabaseAdmin
      .from('user_registry')
      .select('user_role')
      .eq('email', email)
      .single()

    if (regError || !reg) {
      // เพื่อความปลอดภัย ไม่ควรบอกว่าไม่พบเมล แต่ให้บอกว่าระบบส่งข้อมูลไปแล้ว (ถ้ามี)
      return { success: true, message: 'หากพบอีเมลนี้ในระบบ เราจะส่งลิงก์กู้คืนให้คุณทางอีเมล' }
    }

    const isExternal = ['approval', 'guest'].includes(reg.user_role)

    if (!isExternal) {
      // --- กรณี Staff: ใช้ Supabase Auth (Password) ---
      const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/dashboard/profile?tab=security`
      })
      if (error) throw error
    } else {
      // --- กรณี Guest/Approval: ใช้ Resend (PIN) ---
      
      // 1. สร้าง Token แบบสุ่ม
      const token = crypto.randomBytes(32).toString('hex')
      const expires = new Date(Date.now() + 3600000) // หมดอายุใน 1 ชม.

      // 2. บันทึกลง external_users
      const { error: updateError } = await supabaseAdmin
        .from('external_users')
        .update({ 
          pin_reset_token: token, 
          pin_reset_expires: expires.toISOString() 
        })
        .eq('email', email)

      if (updateError) throw updateError

      // 3. ส่งอีเมลผ่าน Resend
      const resetLink = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/reset-pin?token=${token}`
      
      const { data, error: sendError } = await resend.emails.send({
        from: 'DOWA IT System <onboarding@resend.dev>',
        to: [email],
        subject: '[DOWA IT System] Account Security Recovery Request',
        html: `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #1e293b; background-color: #f8fafc; line-height: 1.6;">
            <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
              <div style="background-color: #1d4ed8; padding: 32px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 24px; letter-spacing: -0.5px;">DOWA IT System</h1>
                <p style="color: #bfdbfe; margin: 8px 0 0 0; font-size: 14px;">DOWA Thermotech (Thailand) Co., Ltd.</p>
              </div>
              
              <div style="padding: 40px;">
                <h2 style="font-size: 20px; font-weight: 700; color: #111827; margin-bottom: 16px;">Account Recovery Request</h2>
                <p style="margin-bottom: 24px;">Hello,</p>
                <p style="margin-bottom: 24px;">
                  We received a request to reset the security credentials (PIN) for your account associated with the 
                  <strong>DOWA IT Incident Management System</strong>. To proceed with setting up a new 6-digit PIN, 
                  please click the secure button below:
                </p>
                
                <div style="text-align: center; margin: 32px 0;">
                  <a href="${resetLink}" style="display: inline-block; padding: 16px 32px; background-color: #1d4ed8; color: white; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 16px; box-shadow: 0 10px 15px -3px rgba(29, 78, 216, 0.3);">
                    Reset My Security PIN
                  </a>
                </div>
                
                <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 16px; margin-bottom: 24px;">
                  <p style="margin: 0; font-size: 13px; color: #92400e;">
                    <strong>Security Notice:</strong> This link will expire in <strong>60 minutes</strong>. 
                    If you did not initiate this request, please ignore this email or contact your IT administrator if you have concerns about your account security.
                  </p>
                </div>
                
                <p style="font-size: 14px; color: #64748b;">
                  Best regards,<br>
                  <strong>IT Department</strong><br>
                  DOWA Thermotech (Thailand) Co., Ltd.
                </p>
              </div>
              
              <div style="background-color: #f1f5f9; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8;">
                This is an automated message. Please do not reply to this email.<br>
                © 2026 DOWA Thermotech (Thailand) Co., Ltd. All rights reserved.
              </div>
            </div>
          </div>
        `
      })

      if (sendError) throw sendError
    }

    return { success: true, message: 'ระบบได้ส่งลิงก์กู้คืนรหัสไปให้ทางอีเมลของคุณแล้ว' }
  } catch (err) {
    console.error('Recovery Request Error:', err)
    return { success: false, error: err.message }
  }
}

export async function resetPINWithToken({ token, newPIN }) {
  try {
    if (!token || !newPIN) throw new Error('ข้อมูลไม่ครบถ้วน')
    if (!/^\d{6}$/.test(newPIN)) throw new Error('PIN ต้องเป็นตัวเลข 6 หลัก')

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    const bcrypt = require('bcryptjs')

    // 1. ตรวจสอบ Token
    const { data: user, error: findError } = await supabaseAdmin
      .from('external_users')
      .select('id, pin_reset_expires')
      .eq('pin_reset_token', token)
      .single()

    if (findError || !user) throw new Error('ลิงก์กู้คืนไม่ถูกต้องหรือถูกใช้งานไปแล้ว')

    // 2. ตรวจสอบวันหมดอายุ
    if (new Date(user.pin_reset_expires) < new Date()) {
      throw new Error('ลิงก์กู้คืนหมดอายุแล้ว กรุณาขอใหม่')
    }

    // 3. Hash PIN ใหม่
    const salt = await bcrypt.genSalt(10)
    const pinHash = await bcrypt.hash(newPIN, salt)

    // 4. อัปเดต PIN และล้าง Token
    const { error: updateError } = await supabaseAdmin
      .from('external_users')
      .update({
        pin_hash: pinHash,
        pin_reset_token: null,
        pin_reset_expires: null
      })
      .eq('id', user.id)

    if (updateError) throw updateError

    return { success: true }
  } catch (err) {
    console.error('resetPINWithToken error:', err)
    return { success: false, error: err.message }
  }
}
