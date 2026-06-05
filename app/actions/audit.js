'use server'

const ZERO_UUID = '00000000-0000-0000-0000-000000000000'

export const AUDIT_HIDDEN_FIELDS = [
  'signature_pin',
  'pin',
  'pin_hash',
  'otp',
  'otp_code',
  'password',
  'password_hash',
  'signature_data',
]

function isHiddenField(field) {
  return AUDIT_HIDDEN_FIELDS.includes(String(field || '').trim().toLowerCase())
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function stableSerialize(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerialize(item)).join(',')}]`
  }

  if (isPlainObject(value)) {
    const entries = Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`)
    return `{${entries.join(',')}}`
  }

  return JSON.stringify(value)
}

function valuesEqual(left, right) {
  return stableSerialize(left) === stableSerialize(right)
}

function summarizeTemplateData(oldValue, newValue) {
  const oldPhotos = Array.isArray(oldValue?.photos) ? oldValue.photos.length : 0
  const newPhotos = Array.isArray(newValue?.photos) ? newValue.photos.length : 0
  const oldKeys = isPlainObject(oldValue) ? Object.keys(oldValue).length : 0
  const newKeys = isPlainObject(newValue) ? Object.keys(newValue).length : 0

  return `template_data updated (photos ${oldPhotos} -> ${newPhotos}, keys ${oldKeys} -> ${newKeys})`
}

export function summarizeComplexField(field, oldValue, newValue) {
  if (field === 'template_data') {
    return summarizeTemplateData(oldValue, newValue)
  }

  if (Array.isArray(oldValue) || Array.isArray(newValue)) {
    const oldCount = Array.isArray(oldValue) ? oldValue.length : 0
    const newCount = Array.isArray(newValue) ? newValue.length : 0
    return `${field} updated (${oldCount} -> ${newCount} items)`
  }

  if (isPlainObject(oldValue) || isPlainObject(newValue)) {
    const oldCount = isPlainObject(oldValue) ? Object.keys(oldValue).length : 0
    const newCount = isPlainObject(newValue) ? Object.keys(newValue).length : 0
    return `${field} updated (${oldCount} -> ${newCount} keys)`
  }

  return `${field} updated`
}

export function buildFieldChanges(before = {}, after = {}, allowlist = [], options = {}) {
  const fields = Array.isArray(allowlist) && allowlist.length > 0
    ? allowlist
    : Array.from(new Set([...Object.keys(before || {}), ...Object.keys(after || {})]))

  return fields.reduce((changes, field) => {
    if (isHiddenField(field)) return changes

    const oldValue = before?.[field]
    const newValue = after?.[field]

    if (valuesEqual(oldValue, newValue)) return changes

    const shouldSummarize =
      field === 'template_data' ||
      options?.summarizeFields?.includes?.(field) ||
      Array.isArray(oldValue) ||
      Array.isArray(newValue) ||
      isPlainObject(oldValue) ||
      isPlainObject(newValue)

    if (shouldSummarize) {
      changes.push({
        field,
        summary: summarizeComplexField(field, oldValue, newValue),
      })
      return changes
    }

    changes.push({
      field,
      old_value: oldValue ?? null,
      new_value: newValue ?? null,
    })

    return changes
  }, [])
}

export function buildAuditLogPayload({
  scope,
  entityType,
  entityId,
  entityLabel,
  sourceModule,
  action,
  details,
  userEmail,
  before = {},
  after = {},
  allowlist = [],
  metadata = {},
  docId,
  docType,
} = {}) {
  const fieldChanges = buildFieldChanges(before, after, allowlist, metadata?.diffOptions || {})
  const baseMetadata = {
    ...metadata,
    scope,
    entity_type: entityType,
    entity_id: entityId,
    entity_label: entityLabel,
    source_module: sourceModule,
    field_changes: fieldChanges,
  }

  delete baseMetadata.diffOptions

  return {
    doc_id: docId || entityId || ZERO_UUID,
    doc_type: docType || entityType || 'system',
    action,
    details,
    user_email: userEmail || 'system@internal',
    metadata: baseMetadata,
  }
}

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
