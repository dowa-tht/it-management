import { supabase } from './supabase'

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

/**
 * Submits a document for approval and snapshots the assigned approver.
 * If no primary approver is set, it performs Auto-Approval.
 */
export async function submitRequest(docId, targetType, triggerKey) {
  // 1. Find the current assigned approver from config
  const { data: config } = await supabase
    .from('approval_configs')
    .select('primary_approver_id')
    .eq('target_type', targetType)
    .eq('freq_type', triggerKey)
    .single()

  const isAutoApprove = !config || !config.primary_approver_id

  const { error } = await supabase
    .from('checklist_docs')
    .update({
      workflow_status: isAutoApprove ? 'approved' : 'pending',
      assigned_approver_id: config?.primary_approver_id || null, // Snapshot!
      approval_comment: isAutoApprove ? 'ระบบอนุมัติอัตโนมัติ (ตามการตั้งค่า)' : null
    })
    .eq('id', docId)
  
  if (error) return { success: false, error: error.message }

  await supabase.from('checklist_logs').insert({
    doc_id: docId,
    action: isAutoApprove ? 'Auto-Approved' : 'Submitted',
    details: isAutoApprove 
      ? 'ระบบอนุมัติงานให้อัตโนมัติตามการตั้งค่า' 
      : `ส่งเอกสารเพื่อขออนุมัติ (ผู้อนุมัติหลัก: ${config?.primary_approver_id || 'ระบบ Pool'})`
  })

  return { success: true, autoApproved: isAutoApprove }
}
