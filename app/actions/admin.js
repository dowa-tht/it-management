'use server'

import { createClient } from '@supabase/supabase-js'

export async function createAdminUser({ email, password, full_name, role, can_be_assignee }) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return { success: false, error: 'เกิดข้อผิดพลาดที่ Server: ไม่พบ SUPABASE_SERVICE_ROLE_KEY' }
    }

    // สร้าง Supabase Client ที่มีสิทธิ์ระดับ Admin
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // 1. สร้างบัญชีผู้ใช้ในระบบ Auth
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name }
    })

    if (error) {
      return { success: false, error: error.message }
    }

    // 2. สร้าง Profile ในตาราง user_profiles
    const { error: profileError } = await supabaseAdmin.from('user_profiles').upsert({
      id: data.user.id,
      full_name,
      role,
      is_active: true,
      can_be_assignee,
    })

    if (profileError) {
      return { success: false, error: `สร้างบัญชีสำเร็จ แต่เกิดปัญหาตอนสร้างโปรไฟล์: ${profileError.message}` }
    }

    // 3. Sync ลง user_registry (Bridge Table)
    const normalizedRole = role === 'superuser' ? 'administrator' : 'supervisor'
    await supabaseAdmin.from('user_registry').upsert({
      email: email,
      full_name: full_name,
      user_role: normalizedRole,
      supabase_user_id: data.user.id,
      is_active: true,
      can_be_assignee: can_be_assignee || false
    }, { onConflict: 'email' })

    return { success: true }
  } catch (err) {
    return { success: false, error: err.message || 'Internal Server Error' }
  }
}

export async function getAdminUsers() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const adminClient = createClient(supabaseUrl, supabaseServiceKey)

    // ดึงข้อมูลจาก user_registry ซึ่งเป็นจุดรวมของทุก Tier
    const { data: registryUsers, error } = await adminClient
      .from('user_registry')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    // แปลงข้อมูลให้เข้ากับ UI เดิม
    const formatted = registryUsers.map(u => ({
      id: u.supabase_user_id || u.external_user_id || u.id,
      email: u.email,
      full_name: u.full_name,
      role: u.user_role, // 'administrator', 'supervisor', 'approval', 'guest'
      is_active: u.is_active,
      can_be_assignee: u.can_be_assignee,
      created_at: u.created_at,
      // mapping สำหรับ UI logic เดิม
      is_external: !!u.external_user_id
    }))

    return { success: true, data: formatted }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

export async function updateAdminUser({ id, full_name, role, can_be_assignee, is_active }) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return { success: false, error: 'เกิดข้อผิดพลาดที่ Server: ไม่พบ SUPABASE_SERVICE_ROLE_KEY' }
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // 1. อัปเดตข้อมูลใน Auth Metadata (เลือกทำ)
    await adminClient.auth.admin.updateUserById(id, {
      user_metadata: { full_name }
    })

    // 2. อัปเดตข้อมูลใน user_profiles (ต้อง Map กลับเป็น superuser/user เพื่อไม่ให้ติด Constraint)
    const legacyRole = (role === 'administrator' || role === 'superuser') ? 'superuser' : 'user'
    const { error: profileUpdateError } = await adminClient.from('user_profiles').update({
      full_name,
      role: legacyRole,
      can_be_assignee,
      is_active
    }).eq('id', id)

    if (profileUpdateError) throw profileUpdateError

    // 3. Sync ลง user_registry
    const normalizedRole = (role === 'superuser' || role === 'administrator') ? 'administrator' : 
                           (role === 'user' || role === 'supervisor') ? 'supervisor' : role

    await adminClient.from('user_registry').update({
      full_name,
      user_role: normalizedRole,
      is_active,
      can_be_assignee,
      last_role_changed_at: new Date().toISOString()
    }).eq('supabase_user_id', id).eq('external_user_id', null)

    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

export async function updateAdminUserPassword(userId, newPassword) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return { success: false, error: 'เกิดข้อผิดพลาดที่ Server: ไม่พบ SUPABASE_SERVICE_ROLE_KEY' }
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword
    })

    if (error) throw error

    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
}
