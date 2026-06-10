'use server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { revalidatePath, unstable_noStore as noStore } from 'next/cache'
import { randomBytes, randomUUID } from 'crypto'
import { normalizeRole, hashEmail } from '@/lib/auth'
import { buildOnboardingInviteEmail } from '@/lib/emailTemplates'
import { buildPublicBaseUrl } from '@/lib/publicBaseUrl'
import { getCurrentUserSession } from './user'
import { recordSystemError } from './workflow'

const DEFAULT_AUDITOR_EXPIRY_DAYS = 3
const AUDITOR_QUICK_EXTEND_OPTIONS = [3, 7, 15, 30]

function addDays(baseDate, days) {
  const next = new Date(baseDate)
  next.setDate(next.getDate() + days)
  return next
}

function getDefaultAuditorExpiry(now = new Date()) {
  return addDays(now, DEFAULT_AUDITOR_EXPIRY_DAYS).toISOString()
}

function resolveAuditorExtendedExpiry(currentExpiry, days, now = new Date()) {
  const parsedExpiry = currentExpiry ? new Date(currentExpiry) : null
  const hasValidFutureExpiry =
    parsedExpiry &&
    !Number.isNaN(parsedExpiry.getTime()) &&
    parsedExpiry.getTime() > now.getTime()

  const base = hasValidFutureExpiry ? parsedExpiry : now
  return addDays(base, days).toISOString()
}

async function requireAdminAccess() {
  const session = await getCurrentUserSession()
  if (!session || session.type !== 'internal') {
    throw new Error('กรุณาเข้าสู่ระบบก่อนใช้งาน')
  }

  const adminClient = getSupabaseAdmin()
  const { data: actor, error } = await adminClient
    .from('user_profiles')
    .select('id, email, full_name, role')
    .eq('id', session.user.id)
    .single()

  if (error || !actor) {
    throw new Error('ไม่พบข้อมูลผู้ดูแลระบบ')
  }

  if (actor.role !== 'admin') {
    throw new Error('คุณไม่มีสิทธิ์ดำเนินการนี้')
  }

  return { adminClient, actor, session }
}

/**
 * 📝 บันทึกประวัติการดำเนินการของ Admin (Audit Log)
 */
async function recordAdminAction(targetUserId, action, details = {}) {
  try {
    const session = await getCurrentUserSession()
    if (!session) return

    const adminClient = getSupabaseAdmin()

    await adminClient.from('admin_audit_logs').insert([{
      admin_id: session.user.id,
      admin_email: session.user.email,
      target_user_id: targetUserId,
      action,
      details
    }])
  } catch (err) {
    console.warn('Failed to record admin audit log:', err)
  }
}

async function autoLinkIncidentsByReporterEmail(userId, email, actorEmail = 'system@internal') {
  const normalizedEmail = String(email || '').trim().toLowerCase()
  if (!userId || !normalizedEmail) return { linkedCount: 0 }

  const adminClient = getSupabaseAdmin()
  const { data: linkedRows, error: linkErr } = await adminClient
    .from('incidents')
    .update({ reported_by_id: userId })
    .eq('reporter_email', normalizedEmail)
    .is('reported_by_id', null)
    .select('id, case_number')

  if (linkErr) throw linkErr

  const linkedCount = linkedRows?.length || 0
  await recordAdminAction(userId, 'AUTO_LINK_INCIDENTS_BY_EMAIL', {
    email: normalizedEmail,
    linked_count: linkedCount,
    incident_ids: (linkedRows || []).map((r) => r.id),
    incident_case_numbers: (linkedRows || []).map((r) => r.case_number).filter(Boolean),
    actor_email: actorEmail,
  })

  return { linkedCount }
}

/**
 * 🚀 ยกระดับการสร้าง User เป็นระบบ Unified Auth (Supabase Auth 100%)
 */
export async function createAdminUser({ email, password, full_name, role, can_be_assignee, sendEmailInvite = true }) {
  try {
    const adminClient = getSupabaseAdmin()

    // 🛡️ A. Pre-flight Check: ค้นหาใน user_profiles เพื่อตรวจสอบสถานะ Onboarding
    const { data: existingProfile } = await adminClient
      .from('user_profiles')
      .select('id, is_onboarded, email')
      .eq('email', email)
      .maybeSingle()

    if (existingProfile) {
      if (existingProfile.is_onboarded) {
        throw new Error('อีเมลนี้ได้ลงทะเบียนและทำ Onboarding เรียบร้อยแล้วในระบบ')
      } else {
        throw new Error('อีเมลนี้มีอยู่ในระบบแล้วแต่ยังทำ Onboarding ไม่สำเร็จ กรุณากดลบบัญชีผู้ใช้นี้ออกก่อนแล้วลองสร้างใหม่อีกครั้ง')
      }
    }

    // 🛡️ B. Pre-flight Check (Self-Healing): ตรวจสอบบัญชีตกค้างฝั่ง auth.users (ไม่มี Profile)
    const { data: { users }, error: listErr } = await adminClient.auth.admin.listUsers()
    if (!listErr && users) {
      const existingAuthUser = users.find(u => u.email?.trim().toLowerCase() === String(email).trim().toLowerCase())
      if (existingAuthUser) {
        console.log(`🛡️ Self-Healing: ตรวจพบสิทธิ์ค้างคาฝั่ง Auth (${email}) ไร้ Profile ในระบบ ดำเนินการเคลียร์ออกก่อนสร้างใหม่...`)
        const { error: delErr } = await adminClient.auth.admin.deleteUser(existingAuthUser.id)
        if (delErr) {
          console.error('Failed to clean up orphaned auth user:', delErr)
          throw new Error(`ตรวจพบข้อมูลสิทธิ์ค้างคาในระบบ Auth และไม่สามารถเคลียร์ได้อัตโนมัติ: ${delErr.message}`)
        }
        console.log(`🛡️ Self-Healing: เคลียร์บัญชีค้างคาฝั่ง Auth สำเร็จ`)
      }
    }

    const isInviteOnly = !password;
    const finalPassword = password || randomBytes(16).toString('hex');

    // 1. นำสิทธิ์มาทำความสะอาด (Normalization)
    const normalizedRole = normalizeRole(role)

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

    // 2.2 Calculate Expiry for Auditor
    let expiresAt = null
    if (normalizedRole === 'auditor') {
      expiresAt = getDefaultAuditorExpiry()
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

    const actorSession = await getCurrentUserSession()
    await autoLinkIncidentsByReporterEmail(userId, email, actorSession?.user?.email || 'system@internal')

    // 🛡️ บันทึก Audit Log
    await recordAdminAction(userId, 'CREATE_USER', { 
      email, 
      full_name, 
      role: normalizedRole,
      can_be_assignee 
    })

    // 4. ส่ง Email ตามเงื่อนไข
    if (sendEmailInvite) {
      try {
        const { sendEmail } = await import('@/lib/resend')
        const setupUrl = `${buildPublicBaseUrl()}/onboarding?token=${onboardingToken}`
        const emailHtml = buildOnboardingInviteEmail({
          fullName: full_name,
          setupUrl,
          isInviteOnly,
          password,
        })

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
    await recordSystemError('Admin', `Create user failed for ${email}: ${err.message}`, { email, error: err })
    return { success: false, error: err.message }
  }
}

/**
 * 📋 ดึงข้อมูลผู้ใช้จาก Source of Truth เดียว (user_profiles)
 */
export async function getAdminUsers() {
  try {
    const adminClient = getSupabaseAdmin()

    const { data: profiles, error } = await adminClient
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('getAdminUsers Database Error:', error)
      throw error
    }

    console.log(`getAdminUsers success: fetched ${profiles?.length || 0} users`)

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
    const { adminClient } = await requireAdminAccess()
    const normalizedRole = normalizeRole(role)
    const { data: currentProfile, error: currentProfileError } = await adminClient
      .from('user_profiles')
      .select('role, expires_at, is_active')
      .eq('id', id)
      .single()

    if (currentProfileError || !currentProfile) {
      throw new Error('ไม่พบข้อมูลผู้ใช้ที่ต้องการอัปเดต')
    }

    let nextExpiresAt = currentProfile.expires_at || null
    if (normalizedRole !== 'auditor') {
      nextExpiresAt = null
    } else if (currentProfile.role !== 'auditor') {
      nextExpiresAt = getDefaultAuditorExpiry()
    }

    await adminClient.auth.admin.updateUserById(id, {
      user_metadata: { full_name, role: normalizedRole }
    })

    const { error } = await adminClient.from('user_profiles').update({
      full_name,
      role: normalizedRole,
      can_be_assignee,
      is_active,
      expires_at: nextExpiresAt,
    }).eq('id', id)

    if (error) throw error

    // 🛡️ บันทึก Audit Log
    await recordAdminAction(id, 'UPDATE_USER', {
      full_name,
      role: normalizedRole,
      can_be_assignee,
      is_active,
      previous_role: currentProfile.role,
      previous_expires_at: currentProfile.expires_at,
      next_expires_at: nextExpiresAt,
    })

    revalidatePath('/dashboard/settings/users')
    return {
      success: true,
      user: {
        id,
        email,
        full_name,
        role: normalizedRole,
        can_be_assignee,
        is_active,
        expires_at: nextExpiresAt,
      },
    }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

export async function extendAuditorExpiry(userId, days) {
  try {
    const extendDays = Number(days)
    if (!AUDITOR_QUICK_EXTEND_OPTIONS.includes(extendDays)) {
      throw new Error('จำนวนวันที่เลือกไม่ถูกต้อง')
    }

    const { adminClient, actor } = await requireAdminAccess()
    const { data: profile, error } = await adminClient
      .from('user_profiles')
      .select('id, email, full_name, role, expires_at, is_active, can_be_assignee')
      .eq('id', userId)
      .single()

    if (error || !profile) {
      throw new Error('ไม่พบข้อมูลผู้ใช้')
    }

    if (profile.role !== 'auditor') {
      throw new Error('ต่ออายุได้เฉพาะบัญชี Auditor เท่านั้น')
    }

    const now = new Date()
    const previousExpiryDate = profile.expires_at ? new Date(profile.expires_at) : null
    const isExpired =
      !previousExpiryDate ||
      Number.isNaN(previousExpiryDate.getTime()) ||
      previousExpiryDate.getTime() <= now.getTime()

    const nextExpiresAt = resolveAuditorExtendedExpiry(profile.expires_at, extendDays, now)
    const nextIsActive = isExpired ? true : profile.is_active

    const { error: updateError } = await adminClient
      .from('user_profiles')
      .update({
        expires_at: nextExpiresAt,
        is_active: nextIsActive,
      })
      .eq('id', userId)

    if (updateError) throw updateError

    await recordAdminAction(userId, 'EXTEND_AUDITOR_EXPIRY', {
      target_email: profile.email,
      target_name: profile.full_name,
      days_added: extendDays,
      previous_expires_at: profile.expires_at,
      next_expires_at: nextExpiresAt,
      previous_is_active: profile.is_active,
      next_is_active: nextIsActive,
      actor_email: actor.email,
      actor_name: actor.full_name,
    })

    revalidatePath('/dashboard/settings/users')
    return {
      success: true,
      user: {
        ...profile,
        expires_at: nextExpiresAt,
        is_active: nextIsActive,
      },
      message: `ต่ออายุบัญชี Auditor เพิ่ม ${extendDays} วันเรียบร้อย`,
    }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

/**
 * 🔐 อัปเดตรหัสผ่าน
 */
export async function updateAdminUserPassword(userId, newPassword) {
  try {
    const adminClient = getSupabaseAdmin()

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

    const adminClient = getSupabaseAdmin()

    const { data: profile } = await adminClient.from('user_profiles').select('id, email').eq('email', email).single()
    if (!profile) throw new Error('User not found')

    // 🛡️ ลบตราประทับลับออกจาก Whitelist
    const emailHash = hashEmail(email)
    await adminClient.from('user_whitelist').delete().eq('email_hash', emailHash)

    await adminClient.from('user_profiles').delete().eq('id', profile.id)
    await adminClient.auth.admin.deleteUser(profile.id)

    // 🛡️ บันทึก Audit Log
    await recordAdminAction(profile.id, 'DELETE_USER', { email })

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
    const adminClient = getSupabaseAdmin()

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
    
    const adminClient = getSupabaseAdmin()

    const { error } = await adminClient.from('user_profiles').update({
      signature_pin: hashedPin,
      pin_attempts: 0,
      pin_locked_until: null
    }).eq('id', userId)

    if (error) throw error

    // 🛡️ บันทึก Audit Log
    await recordAdminAction(userId, 'UPDATE_PIN', { action: 'Admin changed user PIN' })

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
    const adminClient = getSupabaseAdmin()

    const { error } = await adminClient.from('user_profiles').update({
      pin_attempts: 0,
      pin_locked_until: null
    }).eq('id', userId)

    if (error) throw error

    // 🛡️ บันทึก Audit Log
    await recordAdminAction(userId, 'UNLOCK_PIN', { action: 'Admin unlocked user account' })

    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
}
