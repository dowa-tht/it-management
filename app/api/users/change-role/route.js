import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { normalizeRole } from '@/lib/auth'

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
    .select('role, id')
    .eq('id', session.user.id)
    .single()

  const role = normalizeRole(profile?.role)
  if (role !== 'admin') return null
  return { ...session.user, profileId: profile.id }
}

// PATCH /api/users/change-role
export async function PATCH(request) {
  try {
    const caller = await requireAdmin()
    if (!caller) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { targetUserId, newRole } = await request.json()
    if (!targetUserId || !newRole) {
      return Response.json({ error: 'Missing targetUserId or newRole' }, { status: 400 })
    }

    // ห้ามเปลี่ยน Role ตัวเอง
    if (targetUserId === caller.id) {
      return Response.json({ error: 'Cannot change your own role' }, { status: 403 })
    }

    const adminClient = getSupabaseAdmin()

    // ตรวจสอบ Admin คนสุดท้าย
    if (newRole !== 'admin') {
      const { data: admins } = await adminClient
        .from('user_profiles')
        .select('id')
        .eq('role', 'superuser')
        .eq('is_active', true)

      const { data: targetProfile } = await adminClient
        .from('user_profiles')
        .select('role')
        .eq('id', targetUserId)
        .single()

      if (targetProfile?.role === 'superuser' && admins?.length <= 1) {
        return Response.json(
          { error: 'ต้องมี Administrator อย่างน้อย 1 Account' },
          { status: 403 }
        )
      }
    }

    // อัปเดต user_profiles (ใช้ค่า legacy: superuser / user)
    const legacyRole = newRole === 'admin' ? 'admin' : 'user'
    const { error } = await adminClient
      .from('user_profiles')
      .update({ role: legacyRole })
      .eq('id', targetUserId)

    if (error) return Response.json({ error: error.message }, { status: 400 })

    // Sync user_registry
    await adminClient
      .from('user_registry')
      .update({
        user_role: newRole,
        last_role_changed_at: new Date().toISOString(),
        last_role_changed_by: caller.id,
      })
      .eq('supabase_user_id', targetUserId)

    return Response.json({ success: true })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
