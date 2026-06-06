'use server'

import { buildAuditLogPayload } from '../../lib/audit.js'

export async function recordEntityAuditLog(payload) {
  const { getSupabaseAdmin } = await import('../../lib/supabaseAdmin.js')
  const supabaseAdmin = getSupabaseAdmin()
  const normalizedPayload = buildAuditLogPayload(payload)

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

export async function recordClientAuditLog({
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
} = {}) {
  const { session, actor } = await resolveAuditActor()

  const payload = buildAuditLogPayload({
    scope,
    entityType,
    entityId,
    entityLabel,
    sourceModule,
    action,
    details,
    userEmail: session.user.email,
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

  if (skipIfNoChanges && payload.metadata.field_changes.length === 0) {
    return { success: true, skipped: true, payload }
  }

  return recordEntityAuditLog(payload)
}
