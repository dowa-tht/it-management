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

    // 0. ตรวจสอบจาก Registry ก่อนว่าเป็น User ประเภทไหน
    const { data: regEntry } = await adminClient
      .from('user_registry')
      .select('*')
      .or(`supabase_user_id.eq.${id},external_user_id.eq.${id},id.eq.${id}`)
      .single()

    if (!regEntry) throw new Error('ไม่พบข้อมูลผู้ใช้ในระบบ')

    const isInternal = !!regEntry.supabase_user_id
    const targetId = regEntry.supabase_user_id || regEntry.external_user_id

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

    await adminClient.from('user_registry').update({
      full_name,
      user_role: normalizedRole,
      is_active,
      can_be_assignee: isInternal ? can_be_assignee : false, // ภายนอกไม่รับเคส
      last_role_changed_at: new Date().toISOString()
    }).eq('id', regEntry.id)

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
