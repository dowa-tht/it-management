'use server'

import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export async function getCurrentUserSession() {
  const cookieStore = await cookies()
  const guestSession = cookieStore.get('guest-session')
  
  if (guestSession) {
    try {
      const decoded = JSON.parse(Buffer.from(guestSession.value, 'base64').toString('utf8'))
      if (decoded.exp > Date.now()) {
        return { type: 'external', user: decoded }
      }
    } catch (e) {
      console.error('Invalid guest session cookie')
    }
  }
  
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
  if (user) {
    // 🛡️ [Security Hardening] Check for Auditor Auto-Deactivation
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const adminClient = createClient(supabaseUrl, serviceKey)
    
    const { data: profile } = await adminClient
      .from('user_profiles')
      .select('role, expires_at, is_active')
      .eq('id', user.id)
      .single()

    if (profile && profile.role === 'auditor' && profile.expires_at) {
      if (new Date(profile.expires_at) < new Date()) {
        // บัญชีหมดอายุ -> สั่ง Deactivate ทันที
        if (profile.is_active) {
          await adminClient.from('user_profiles').update({ is_active: false }).eq('id', user.id)
        }
        await supabase.auth.signOut()
        return null
      }
    }

    return { type: 'internal', user: user }
  }
  
  return null
}

export async function getCurrentActorProfile() {
  const session = await getCurrentUserSession()
  if (!session?.user) return null

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const adminClient = createClient(supabaseUrl, serviceKey)

  if (session.type === 'external') {
    const { data: ext } = await adminClient
      .from('external_users')
      .select('id, email, full_name, role')
      .eq('id', session.user.id)
      .maybeSingle()

    return {
      id: ext?.id || session.user.id,
      email: ext?.email || session.user.email || null,
      full_name: ext?.full_name || session.user.name || session.user.email || 'External User',
      role: ext?.role || session.user.role || 'auditor',
      session_type: 'external',
    }
  }

  const { data: profile } = await adminClient
    .from('user_profiles')
    .select('id, email, full_name, role')
    .eq('id', session.user.id)
    .maybeSingle()

  return {
    id: profile?.id || session.user.id,
    email: profile?.email || session.user.email || null,
    full_name: profile?.full_name || session.user.email || 'User',
    role: profile?.role || null,
    session_type: 'internal',
  }
}

export async function changeExternalPIN({ currentPIN, newPIN }) {
  try {
    const session = await getCurrentUserSession()
    if (!session || session.type !== 'external') {
      throw new Error('กรุณาเข้าสู่ระบบด้วย PIN ก่อน')
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const adminClient = createClient(supabaseUrl, serviceKey)

    const { data: extUser, error: findError } = await adminClient
      .from('external_users')
      .select('*')
      .eq('id', session.user.id)
      .single()

    if (findError || !extUser) throw new Error('ไม่พบข้อมูลผู้ใช้ในระบบ')

    const bcrypt = require('bcryptjs')
    const isPinValid = await bcrypt.compare(currentPIN, extUser.pin_hash)
    if (!isPinValid) {
      throw new Error('PIN เดิมไม่ถูกต้อง')
    }

    const salt = await bcrypt.genSalt(10)
    const pinHash = await bcrypt.hash(newPIN, salt)

    const { error: updateError } = await adminClient
      .from('external_users')
      .update({ pin_hash: pinHash })
      .eq('id', extUser.id)

    return { success: true }
  } catch (err) {
    console.error('changeExternalPIN error:', err)
    return { success: false, error: err.message }
  }
}

/**
 * 📧 ส่งคำขอรีเซ็ตรหัส PIN ไปยังอีเมลผู้ใช้
 */
export async function requestSignaturePinReset(email) {
  try {
    const { sendEmail } = await import('@/lib/resend')
    
    // ดึงข้อมูลชื่อผู้ใช้
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const adminClient = createClient(supabaseUrl, serviceKey)
    const { data: profile } = await adminClient.from('user_profiles').select('full_name').eq('email', email).single()
    
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

    await sendEmail({
      to: [email],
      subject: '[DOWA IT System] Signature PIN Reset Request',
      html: `
        <div style="font-family: sans-serif; padding: 40px; color: #1e293b; background-color: #f8fafc;">
          <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <h1 style="color: #1d4ed8; margin-top: 0;">Signature PIN Reset</h1>
            <p>Hello <strong>${profile?.full_name || 'User'}</strong>,</p>
            <p>We received a request to reset your Signature PIN for the DOWA IT System.</p>
            <div style="background-color: #fffbeb; padding: 20px; border-radius: 12px; margin: 24px 0; border: 1px solid #fcd34d;">
              <p style="margin: 0; font-size: 14px; color: #92400e;">
                <strong>Instructions:</strong><br/>
                Please contact your <strong>System Administrator</strong> to reset your PIN or unlock your account. 
                Once reset, you can set a new 6-digit PIN in your Profile settings.
              </p>
            </div>
            <p style="font-size: 13px; color: #64748b;">If you didn't request this, please ignore this email or notify IT support if you're concerned about your account security.</p>
            <div style="text-align: center; margin-top: 32px;"><a href="${siteUrl}/dashboard/profile" style="display: inline-block; padding: 14px 28px; background-color: #1d4ed8; color: white; text-decoration: none; border-radius: 10px; font-weight: bold;">Go to Profile Settings</a></div>
          </div>
        </div>
      `
    })

    return { success: true }
  } catch (err) {
    console.error('requestSignaturePinReset error:', err)
    return { success: false, error: err.message }
  }
}
