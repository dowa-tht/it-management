import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { normalizeRole } from '@/lib/auth'

// ตรวจสอบว่า caller เป็น administrator จาก Session
async function requireAdmin() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()

  const role = normalizeRole(profile?.role)
  if (role !== 'administrator') return null
  return session.user
}

// POST /api/users/create
export async function POST(request) {
  try {
    const caller = await requireAdmin()
    if (!caller) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { email, password, full_name, role, can_be_assignee } = await request.json()

    if (!email || !password || !full_name) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const adminClient = getSupabaseAdmin()

    // สร้าง Auth User
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (authError) return Response.json({ error: authError.message }, { status: 400 })

    // สร้าง user_profiles
    const { error: profileError } = await adminClient
      .from('user_profiles')
      .insert({
        id: authData.user.id,
        full_name,
        role: role === 'administrator' ? 'superuser' : 'user',
        can_be_assignee: can_be_assignee || false,
        is_active: true,
      })
    if (profileError) return Response.json({ error: profileError.message }, { status: 400 })

    // Sync user_registry
    await adminClient.from('user_registry').upsert({
      email,
      full_name,
      user_role: role || 'supervisor',
      supabase_user_id: authData.user.id,
      is_active: true,
    }, { onConflict: 'email' })

    return Response.json({ success: true, userId: authData.user.id })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
