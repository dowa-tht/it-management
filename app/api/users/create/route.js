import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { normalizeRole } from '@/lib/auth'

async function autoLinkIncidentsByReporterEmail(adminClient, userId, email) {
  const normalizedEmail = String(email || '').trim().toLowerCase()
  if (!userId || !normalizedEmail) return { linkedCount: 0, linkedRows: [] }

  const { data: linkedRows, error } = await adminClient
    .from('incidents')
    .update({ reported_by_id: userId })
    .eq('reporter_email', normalizedEmail)
    .is('reported_by_id', null)
    .select('id, case_number')

  if (error) throw error
  return { linkedCount: linkedRows?.length || 0, linkedRows: linkedRows || [] }
}

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
  if (role !== 'admin') return null
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

    // 1. นำสิทธิ์มาทำความสะอาด (Normalization)
    const normalizedRole = normalizeRole(role)

    // สร้าง Auth User
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role: normalizedRole }
    })
    if (authError) return Response.json({ error: authError.message }, { status: 400 })

    // สร้าง user_profiles
    const { error: profileError } = await adminClient
      .from('user_profiles')
      .insert({
        id: authData.user.id,
        full_name,
        role: normalizedRole,
        can_be_assignee: can_be_assignee || false,
        is_active: true,
      })
    if (profileError) return Response.json({ error: profileError.message }, { status: 400 })

    // Sync user_registry
    await adminClient.from('user_registry').upsert({
      email,
      full_name,
      user_role: normalizedRole,
      supabase_user_id: authData.user.id,
      is_active: true,
    }, { onConflict: 'email' })

    const autoLinkResult = await autoLinkIncidentsByReporterEmail(adminClient, authData.user.id, email)
    await adminClient.from('admin_audit_logs').insert([{
      admin_id: caller.id,
      admin_email: caller.email,
      target_user_id: authData.user.id,
      action: 'AUTO_LINK_INCIDENTS_BY_EMAIL',
      details: {
        email: String(email || '').trim().toLowerCase(),
        linked_count: autoLinkResult.linkedCount,
        incident_ids: autoLinkResult.linkedRows.map((r) => r.id),
        incident_case_numbers: autoLinkResult.linkedRows.map((r) => r.case_number).filter(Boolean),
      },
    }])

    return Response.json({ success: true, userId: authData.user.id })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
