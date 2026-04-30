'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath, unstable_noStore as noStore } from 'next/cache'

export async function createAdminUser({ email, password, full_name, role, can_be_assignee }) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const normalizedRole = (role === 'administrator' || role === 'superuser') ? 'administrator' : 
                           (role === 'supervisor' || role === 'user') ? 'supervisor' : role
    const isInternal = normalizedRole === 'administrator' || normalizedRole === 'supervisor'

    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

    if (isInternal) {
      // --- กรณีผู้ใช้ภายใน (Tier 1 & 2) ---
      // ใช้ inviteUserByEmail เพื่อให้ Supabase ส่งเมลเชิญพร้อมลิงก์ยืนยันตัวตน
      const { data: authData, error: authError } = await adminClient.auth.admin.inviteUserByEmail(email, {
        data: { full_name, role: normalizedRole },
        redirectTo: `${siteUrl}/dashboard`
      })
      
      if (authError) throw authError

      const legacyRole = normalizedRole === 'administrator' ? 'superuser' : 'user'
      const { error: profileError } = await adminClient.from('user_profiles').upsert({
        id: authData.user.id,
        full_name,
        role: legacyRole,
        is_active: true,
        can_be_assignee: can_be_assignee || false
      })
      if (profileError) throw profileError

      await adminClient.from('user_registry').upsert({
        email,
        full_name,
        user_role: normalizedRole,
        supabase_user_id: authData.user.id,
        is_active: true
      }, { onConflict: 'email' })

    } else {
      // --- กรณีผู้ใช้ภายนอก (Tier 3 & 4 - ใช้ PIN) ---
      const bcrypt = require('bcryptjs')
      const salt = await bcrypt.genSalt(10)
      const pinHash = await bcrypt.hash(password, salt)

      const { data: extData, error: extError } = await adminClient.from('external_users').insert({
        email,
        full_name,
        role: normalizedRole,
        pin_hash: pinHash,
        is_active: true
      }).select().single()
      if (extError) throw extError

      await adminClient.from('user_registry').upsert({
        email,
        full_name,
        user_role: normalizedRole,
        external_user_id: extData.id,
        is_active: true
      }, { onConflict: 'email' })

      // --- ส่ง Welcome Email สำหรับ Guest/Approval ผ่าน Resend ---
      await resend.emails.send({
        from: 'DOWA IT System <onboarding@resend.dev>',
        to: [email],
        subject: '[DOWA IT System] Your account has been created',
        html: `
          <div style="font-family: sans-serif; padding: 40px; color: #1e293b; background-color: #f8fafc;">
            <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
              <h1 style="color: #1d4ed8; margin-top: 0;">Welcome to DOWA IT System</h1>
              <p>Hello <strong>${full_name}</strong>,</p>
              <p>Your account has been successfully created in the <strong>DOWA IT Incident Management System</strong>.</p>
              
              <div style="background-color: #f1f5f9; padding: 20px; border-radius: 12px; margin: 24px 0;">
                <p style="margin: 0; font-size: 14px;"><strong>Account Details:</strong></p>
                <p style="margin: 8px 0 0 0; font-size: 14px;">Role: <span style="text-transform: capitalize;">${normalizedRole}</span></p>
                <p style="margin: 4px 0 0 0; font-size: 14px;">Login Email: ${email}</p>
              </div>
              
              <p>You can now access the system using your email and the PIN provided by your administrator.</p>
              
              <div style="text-align: center; margin-top: 32px;">
                <a href="${siteUrl}" style="display: inline-block; padding: 14px 28px; background-color: #1d4ed8; color: white; text-decoration: none; border-radius: 10px; font-weight: bold;">
                  Go to Login Page
                </a>
              </div>
              
              <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 32px 0;">
              <p style="font-size: 12px; color: #94a3b8; text-align: center;">
                DOWA Thermotech (Thailand) Co., Ltd.<br>
                This is an automated invitation email.
              </p>
            </div>
          </div>
        `
      })
    }

    revalidatePath('/dashboard/settings/users')
    return { success: true }
  } catch (err) {
    console.error('createAdminUser error:', err)
    return { success: false, error: err.message }
  }
}

export async function getAdminUsers() {
  noStore()
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const adminClient = createClient(supabaseUrl, supabaseServiceKey)

    // 1. ดึงข้อมูลจาก user_registry ทั้งหมด
    const { data: registryUsers, error: regError } = await adminClient
      .from('user_registry')
      .select('*')
      .order('created_at', { ascending: false })

    if (regError) throw regError

    // 2. ดึงข้อมูลจาก user_profiles เพื่อเอา can_be_assignee และ is_active
    const { data: profiles, error: profError } = await adminClient
      .from('user_profiles')
      .select('id, can_be_assignee, is_active')

    if (profError) throw profError

    // สร้าง Map เพื่อให้ค้นหา profile ได้ไวขึ้น
    const profileMap = {}
    profiles.forEach(p => { profileMap[p.id] = p })

    // 3. แปลงข้อมูลและประกอบร่างรวมกัน
    const formatted = registryUsers.map(u => {
      const p = u.supabase_user_id ? profileMap[u.supabase_user_id] : null
      return {
        id: u.supabase_user_id || u.external_user_id || u.id,
        email: u.email,
        full_name: u.full_name,
        role: u.user_role,
        is_active: p ? p.is_active : u.is_active,
        can_be_assignee: p ? p.can_be_assignee : (u.can_be_assignee || false),
        created_at: u.created_at,
        is_external: !!u.external_user_id
      }
    })

    return { success: true, data: formatted }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

export async function updateAdminUser({ id, email, full_name, role, can_be_assignee, is_active }) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return { success: false, error: 'เกิดข้อผิดพลาดที่ Server: ไม่พบ SUPABASE_SERVICE_ROLE_KEY' }
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // 0. ตรวจสอบจาก Registry โดยใช้ Email เป็นหลักเพื่อความแม่นยำสูงสุด
    // หากไม่มี Email ให้ใช้ ID ตามเดิม (fallback)
    const query = adminClient.from('user_registry').select('*')
    if (email) {
      query.eq('email', email)
    } else {
      query.or(`supabase_user_id.eq.${id},external_user_id.eq.${id},id.eq.${id}`)
    }
    
    const { data: regEntry } = await query.single()

    if (!regEntry) throw new Error(`ไม่พบผู้ใช้ในระบบ (Email: ${email || 'N/A'}, ID: ${id})`)

    const isInternal = !!regEntry.supabase_user_id
    const targetId = regEntry.supabase_user_id || regEntry.external_user_id

    console.log(`Updating User: ${email} (Internal: ${isInternal})`)
    
    if (isInternal) {
      // --- กรณีผู้ใช้ภายใน (Tier 1 & 2) ---
      // 1. อัปเดต Auth Metadata
      await adminClient.auth.admin.updateUserById(targetId, {
        user_metadata: { full_name }
      })

      // 2. อัปเดต user_profiles
      const legacyRole = (role === 'administrator' || role === 'superuser') ? 'superuser' : 'user'
      const { error: profileError } = await adminClient.from('user_profiles').update({
        full_name,
        role: legacyRole,
        can_be_assignee,
        is_active
      }).eq('id', targetId)
      if (profileError) throw profileError

    } else {
      // --- กรณีผู้ใช้ภายนอก (Tier 3 & 4) ---
      // อัปเดตตาราง external_users
      const { error: externalError } = await adminClient.from('external_users').update({
        full_name,
        role,
        is_active
      }).eq('id', targetId)
      if (externalError) throw externalError
    }

    // 3. Sync ข้อมูลลง user_registry เสมอ
    const normalizedRole = (role === 'superuser' || role === 'administrator') ? 'administrator' : 
                           (role === 'user' || role === 'supervisor') ? 'supervisor' : role

    const { error: regSyncError } = await adminClient.from('user_registry').update({
      full_name,
      user_role: normalizedRole,
      is_active,
      last_role_changed_at: new Date().toISOString()
    }).eq('email', regEntry.email)

    if (regSyncError) throw regSyncError

    console.log(`Update Success for ${email}`)
    revalidatePath('/dashboard/settings/users')
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

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

export async function updateAdminUserPIN({ email, newPIN }) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const adminClient = createClient(supabaseUrl, supabaseServiceKey)

    // 1. ตรวจสอบจาก Registry ก่อนเพื่อให้แน่ใจว่ามีตัวตน
    const { data: regEntry } = await adminClient
      .from('user_registry')
      .select('*')
      .eq('email', email)
      .single()

    if (!regEntry || !regEntry.external_user_id) throw new Error('ไม่พบข้อมูลผู้ใช้ภายนอก (External User) ในระบบ')

    // 2. Hash PIN ใหม่
    const bcrypt = require('bcryptjs')
    const salt = await bcrypt.genSalt(10)
    const pinHash = await bcrypt.hash(newPIN, salt)

    // 3. อัปเดตลงตาราง external_users
    const { error: updateError } = await adminClient
      .from('external_users')
      .update({ pin_hash: pinHash })
      .eq('id', regEntry.external_user_id)

    if (updateError) throw updateError

    return { success: true }
  } catch (err) {
    console.error('updateAdminUserPIN error:', err)
    return { success: false, error: err.message }
  }
}

export async function cleanDeleteUser(email) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // 1. ค้นหาข้อมูลใน Registry ก่อน
    const { data: user } = await adminClient.from('user_registry').select('*').eq('email', email).single()
    if (!user) return { success: false, error: 'User not found' }

    console.log(`⚡ [Clean Remove] Processing: ${email}`)

    // 2. ลบข้อมูลตามลำดับความสัมพันธ์
    // ลบจาก user_registry
    await adminClient.from('user_registry').delete().eq('email', email)

    // ลบจาก user_profiles (ถ้าเป็น Staff)
    if (user.supabase_user_id) {
      await adminClient.from('user_profiles').delete().eq('id', user.supabase_user_id)
      // ลบจาก Auth (Supabase)
      await adminClient.auth.admin.deleteUser(user.supabase_user_id)
    }

    // ลบจาก external_users (ถ้าเป็น Guest/Approval)
    if (user.external_user_id) {
      await adminClient.from('external_users').delete().eq('id', user.external_user_id)
    }

    // หมายเหตุ: ไม่มีการบันทึก addLog ที่นี่ เพื่อให้เป็นการ Clean Remove จริงๆ

    revalidatePath('/dashboard/settings/users')
    return { success: true }
  } catch (err) {
    console.error('cleanDeleteUser error:', err)
    return { success: false, error: err.message }
  }
}
