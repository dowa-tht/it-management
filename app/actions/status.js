'use server'

import { createClient } from '@supabase/supabase-js'

export async function checkUserTier(email) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !serviceKey) {
      return { success: false, error: 'Missing Env Configuration' }
    }

    const adminClient = createClient(supabaseUrl, serviceKey)

    const { data: registry, error } = await adminClient
      .from('user_registry')
      .select('user_role')
      .eq('email', email)
      .eq('is_active', true)
      .single()

    if (error || !registry) return { success: true, tier: 'not_found' }

    const role = registry.user_role
    if (['administrator', 'supervisor'].includes(role)) {
      return { success: true, tier: 'internal', role }
    } else if (['approval', 'guest'].includes(role)) {
      return { success: true, tier: 'external', role }
    }

    return { success: true, tier: 'not_found' }
  } catch (err) {
    console.error('Status Action Error:', err)
    return { success: false, error: err.message }
  }
}
