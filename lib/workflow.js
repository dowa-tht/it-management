import { createClient } from '@supabase/supabase-js'
import { supabase } from './supabase'

export async function recordLog(docId, type, action, details, userEmail) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    const table = type === 'checklist' ? 'checklist_logs' : 'incident_logs'
    const fullAction = details ? `${action}: ${details}` : action
    const { error } = await supabaseAdmin.from(table).insert({
      doc_id: docId,
      action: fullAction,
      user_email: userEmail
    })
    if (error) throw error
    return { success: true }
  } catch (err) {
    console.error('recordLog Error:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Check if a user's PIN is currently locked due to too many failed attempts.
 */
export async function isPinLocked(userId) {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('pin_locked_until')
    .eq('id', userId)
    .single()
  
  if (error || !data.pin_locked_until) return false
  
  const lockedUntil = new Date(data.pin_locked_until)
  const now = new Date()
  
  return lockedUntil > now
}

/**
 * Validates a signature PIN with rate limiting and lockout.
 */
export async function validateSignaturePin(userId, pin) {
  // 1. Check if locked
  if (await isPinLocked(userId)) {
    return { success: false, error: 'รหัส PIN ของคุณถูกระงับชั่วคราว กรุณาลองใหม่ภายหลัง (15 นาที)' }
  }

  // 2. We use a server-side API or Action to verify bcrypt hash
  // For now, let's assume we have an action or we check it here (if client has bcrypt, which it might not)
  // RECOMMENDATION: Use a Server Action for this to keep PIN hash safe.
  // This is a placeholder for the logic that will call the server action.
  const res = await fetch('/api/auth/verify-pin', {
    method: 'POST',
    body: JSON.stringify({ userId, pin })
  }).then(r => r.json())

  return res
}

/**
 * Gets the list of users who are allowed to approve a specific document type.
 * This handles the "Pool" logic.
 */
export async function getEligibleApprovers(targetType, triggerKey) {
  const { data: config } = await supabase
    .from('approval_configs')
    .select('allowed_roles')
    .eq('target_type', targetType)
    .eq('freq_type', triggerKey)
    .single()
  
  if (!config) return []

  const { data: users } = await supabase
    .from('user_profiles')
    .select('id, full_name, role')
    .in('role', config.allowed_roles)
    .eq('is_active', true)
  
  return users || []
}

/**
 * Check if the current user is an active substitute for another user.
 */
export async function isSubstituteOf(subId, primaryId) {
  if (!primaryId) return false
  const now = new Date().toISOString().split('T')[0]
  
  const { data, error } = await supabase
    .from('approval_substitutes')
    .select('id')
    .eq('primary_approver_id', primaryId)
    .eq('substitute_id', subId)
    .eq('is_active', true)
    .lte('start_date', now)
    .gte('end_date', now)
    .limit(1)
  
  return !!data?.length
}

