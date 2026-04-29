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
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
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

    return { success: true }
  } catch (err) {
    return { success: false, error: err.message || 'Internal Server Error' }
  }
}

export async function getAdminUsers() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return { success: false, error: 'เกิดข้อผิดพลาดที่ Server: ไม่พบ SUPABASE_SERVICE_ROLE_KEY' }
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // ดึงข้อมูล users จากระบบ Auth (จะได้ email ที่แท้จริง)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers()
    if (authError) throw authError

    // ดึงข้อมูล profiles ทั้งหมด
    const { data: profiles, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: true })
    if (profileError) throw profileError

    // นำข้อมูลมา Map รวมกัน (ใช้ id เป็นตัวเชื่อม)
    const authMap = {}
    authData.users.forEach(u => { authMap[u.id] = u.email })

    const merged = profiles.map(p => ({
      ...p,
      email: authMap[p.id] || '—'
    }))

    return { success: true, data: merged }
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

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // 1. อัปเดตข้อมูลใน Auth Metadata (เลือกทำ)
    await supabaseAdmin.auth.admin.updateUserById(id, {
      user_metadata: { full_name }
    })

    // 2. อัปเดตข้อมูลใน user_profiles
    const { error } = await supabaseAdmin.from('user_profiles').update({
      full_name,
      role,
      can_be_assignee,
      is_active
    }).eq('id', id)

    if (error) throw error

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

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
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
