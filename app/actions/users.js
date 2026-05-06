'use server'
import { createClient } from '@supabase/supabase-js'
import { getCurrentUserSession } from './user'

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

export async function quickAddUser({ fullName, email, pin = '123456' }) {
  try {
    const session = await getCurrentUserSession()
    if (!session) return { error: 'Unauthorized' }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Check if user already exists
    const { data: existing } = await supabaseAdmin
      .from('user_profiles')
      .select('id')
      .eq('full_name', fullName)
      .maybeSingle()

    if (existing) return { error: 'ชื่อนี้มีอยู่ในระบบแล้ว' }

    // Insert new profile with 'member' role
    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .insert({
        full_name: fullName,
        email: email || null,
        role: 'member',
        pin: pin, // Default PIN
        is_active: true,
        can_be_assignee: false
      })
      .select()
      .single()

    if (error) throw error
    return { data }
  } catch (err) {
    console.error('quickAddUser Error:', err)
    return { error: err.message }
  }
}

export async function verifyMemberPIN(userId, pin) {
  try {
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .select('pin')
      .eq('id', userId)
      .single()

    if (error || !data) return { success: false, error: 'ไม่พบข้อมูลผู้ใช้' }
    if (data.pin !== pin) return { success: false, error: 'PIN ไม่ถูกต้อง' }

    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
}
