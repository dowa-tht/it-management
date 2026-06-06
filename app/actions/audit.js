'use server'

import { buildAuditLogPayload } from '../../lib/audit.js'

function isNormalizedAuditPayload(payload = {}) {
  return Boolean(
    payload &&
    typeof payload === 'object' &&
    payload.metadata &&
    typeof payload.metadata === 'object' &&
    'scope' in payload.metadata &&
    'doc_type' in payload &&
    'doc_id' in payload
  )
}

export async function recordEntityAuditLog(payload) {
  const { getSupabaseAdmin } = await import('../../lib/supabaseAdmin.js')
  const supabaseAdmin = getSupabaseAdmin()
  const normalizedPayload = isNormalizedAuditPayload(payload)
    ? payload
    : buildAuditLogPayload(payload)

  const { error } = await supabaseAdmin
    .from('system_audit_logs')
    .insert(normalizedPayload)

  if (error) {
    throw error
  }

  return { success: true, payload: normalizedPayload }
}

async function resolveAuditActor() {
  const { getCurrentUserSession, getCurrentActorProfile } = await import('./user.js')
  const session = await getCurrentUserSession()

  if (!session || session.type !== 'internal') {
    throw new Error('Unauthorized')
  }

  const actor = await getCurrentActorProfile().catch(() => null)

  return {
    session,
    actor,
  }
}

export async function recordClientAuditLog(payloadInput = {}) {
  const { session, actor } = await resolveAuditActor()
  const {
    scope = 'document',
    entityType,
    entityId,
    entityLabel,
    sourceModule,
    action = 'Updated',
    details = '',
    before = {},
    after = {},
    allowlist = [],
    metadata = {},
    docId,
    docType,
    skipIfNoChanges = true,
  } = payloadInput || {}

  const auditPayload = buildAuditLogPayload({
    scope,
    entityType,
    entityId,
    entityLabel,
    sourceModule,
    action,
    details,
    userEmail: session.user.email || actor?.email || 'system@internal',
    before,
    after,
    allowlist,
    metadata: {
      ...metadata,
      actor_user_id: session.user.id,
      actor_role: actor?.role || session.user.role || null,
    },
    docId,
    docType,
  })

  if (skipIfNoChanges && auditPayload.metadata.field_changes.length === 0) {
    return { success: true, skipped: true, payload: auditPayload }
  }

  return recordEntityAuditLog(auditPayload)
}
