import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { normalizeRole } from '@/lib/auth'
import bcrypt from 'bcryptjs'

async function requireAdmin() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null
  const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', session.user.id).single()
  if (normalizeRole(profile?.role) !== 'administrator') return null
  return session.user
}

// POST /api/users/migrate-tier
export async function POST(request) {
  try {
    const caller = await requireAdmin()
    if (!caller) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { email, targetTier, targetRole, pin } = await request.json()
    // targetTier: 'internal' (Tier 1/2) หรือ 'external' (Tier 3/4)
    // targetRole: 'administrator', 'supervisor', 'approval', 'guest'

    const adminClient = getSupabaseAdmin()

    // 1. ดึงข้อมูลปัจจุบันจาก user_registry
    const { data: registry, error: regError } = await adminClient
      .from('user_registry')
      .select('*')
      .eq('email', email)
      .single()

    if (regError || !registry) return Response.json({ error: 'User not found in registry' }, { status: 404 })

    // --- CASE A: Migrate INTERNAL (Admin/Sup) -> EXTERNAL (Approval/Guest) ---
    if (targetTier === 'external') {
      // 1. ปิดบัญชี Supabase เดิม (ถ้ามี)
      if (registry.supabase_user_id) {
        await adminClient.from('user_profiles').update({ is_active: false }).eq('id', registry.supabase_user_id)
        await adminClient.auth.admin.updateUserById(registry.supabase_user_id, { ban_duration: '1000h' }) // Optional: Soft ban
      }

      // 2. สร้าง External User Record
      const defaultPin = pin || Math.floor(100000 + Math.random() * 900000).toString()
      const pinHash = await bcrypt.hash(defaultPin, 10)
      
      const { data: extUser, error: extError } = await adminClient
        .from('external_users')
        .insert({
          email: email,
          full_name: registry.full_name,
          role: targetRole, // 'approval' หรือ 'guest'
          pin_hash: pinHash,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days default
          is_active: true
        })
        .select('id')
        .single()

      if (extError) return Response.json({ error: extError.message }, { status: 400 })

      // 3. อัปเดต Bridge Table
      await adminClient
        .from('user_registry')
        .update({
          user_role: targetRole,
          external_user_id: extUser.id,
          last_role_changed_at: new Date().toISOString()
        })
        .eq('email', email)

      return Response.json({ success: true, newPin: pin ? '********' : defaultPin })
    }

    // --- CASE B: Migrate EXTERNAL -> INTERNAL ---
    if (targetTier === 'internal') {
      // 1. ปิด External Record
      if (registry.external_user_id) {
        await adminClient.from('external_users').update({ is_active: false }).eq('id', registry.external_user_id)
      }

      let supabaseId = registry.supabase_user_id

      // 2. ตรวจสอบ/สร้าง Supabase Account
      if (!supabaseId) {
        const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: { full_name: registry.full_name }
        })
        if (authError) return Response.json({ error: authError.message }, { status: 400 })
        supabaseId = authData.user.id
      } else {
        // Re-enable
        await adminClient.from('user_profiles').update({ is_active: true }).eq('id', supabaseId)
        await adminClient.auth.admin.updateUserById(supabaseId, { ban_duration: 'none' })
      }

      // 3. ส่ง Password Reset/Magic Link ให้ User ตั้งรหัสผ่าน
      await adminClient.auth.admin.generateLink({
        type: 'recovery',
        email: email
      })

      // 4. อัปเดต Bridge Table
      const legacyRole = targetRole === 'administrator' ? 'superuser' : 'user'
      await adminClient
        .from('user_registry')
        .update({
          user_role: targetRole,
          supabase_user_id: supabaseId,
          last_role_changed_at: new Date().toISOString()
        })
        .eq('email', email)

      // Sync user_profiles
      await adminClient.from('user_profiles').upsert({
        id: supabaseId,
        role: legacyRole,
        full_name: registry.full_name,
        is_active: true
      })

      return Response.json({ success: true, message: 'Migration successful. Password reset email sent.' })
    }

    return Response.json({ error: 'Invalid migration parameters' }, { status: 400 })

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
