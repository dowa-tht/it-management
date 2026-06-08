const ZERO_UUID = '00000000-0000-0000-0000-000000000000'
const APPROVAL_ACTION_KEYWORDS = ['approved', 'rejected', 'submitted', 'verification', 'remote verify', 'auto-closed', 'auto-approved']

export const AUDIT_ZERO_UUID = ZERO_UUID

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

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || '').trim())
}

function prettifyLabel(value) {
  return String(value || '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase())
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

export function buildAuditDetails(action, fieldChanges = [], fallbackDetails = '') {
  if (fallbackDetails) return fallbackDetails
  if (!Array.isArray(fieldChanges) || fieldChanges.length === 0) {
    return action || 'Audit event recorded'
  }

  const labels = fieldChanges
    .slice(0, 3)
    .map((change) => prettifyLabel(change.field))
    .filter(Boolean)

  const suffix = fieldChanges.length > 3 ? ` และอีก ${fieldChanges.length - 3} รายการ` : ''
  return `${action || 'Updated'} ${labels.join(', ')}${suffix}`.trim()
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
  const safeDetails = buildAuditDetails(action, fieldChanges, details)
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
    doc_id: isUuid(docId) ? docId : (isUuid(entityId) ? entityId : ZERO_UUID),
    doc_type: docType || entityType || 'system',
    action,
    details: safeDetails,
    user_email: userEmail || 'system@internal',
    metadata: baseMetadata,
  }
}

export function isApprovalAuditAction(action = '') {
  const normalized = String(action || '').trim().toLowerCase()
  return APPROVAL_ACTION_KEYWORDS.some((keyword) => normalized.includes(keyword))
}

export function classifyAuditCategory({ scope, entityType, action } = {}) {
  if (scope === 'settings') return 'Settings Change'
  if (scope === 'admin') return 'User Admin Action'
  if (scope === 'backup') return 'Operational Backup'
  if (isApprovalAuditAction(action)) return 'Approval'
  if (scope === 'document') return 'Document Change'
  if (entityType === 'incident') return 'Incident'
  if (entityType === 'checklist') return 'Checklist'
  return prettifyLabel(entityType || scope || 'System')
}

export function normalizeAuditViewerRow(row = {}, fullName = '') {
  const metadata = row.metadata || {}
  return {
    ...row,
    category: classifyAuditCategory({
      scope: metadata.scope,
      entityType: metadata.entity_type || row.doc_type,
      action: row.action,
    }),
    scope: metadata.scope || 'workflow',
    entity_type: metadata.entity_type || row.doc_type,
    entity_label: metadata.entity_label || metadata.doc_no || null,
    docNo: metadata.entity_label || metadata.doc_no || '—',
    full_name: fullName || row.user_email,
    user: fullName || row.user_email,
    field_changes: Array.isArray(metadata.field_changes) ? metadata.field_changes : [],
    source_module: metadata.source_module || 'workflow',
  }
}

export function normalizeAdminViewerRow(row = {}, fullName = '') {
  const details = row.details || {}
  const targetLabel = details.target_email || details.email || details.target_name || row.target_user_id || '—'
  return {
    ...row,
    category: 'User Admin Action',
    scope: 'admin',
    entity_type: 'user',
    entity_label: targetLabel,
    docNo: targetLabel,
    full_name: fullName || row.admin_email,
    user: fullName || row.admin_email,
    user_email: row.admin_email,
    details_text: details.action || buildAuditDetails(row.action, [], `Target: ${targetLabel}`),
    field_changes: Array.isArray(details.field_changes) ? details.field_changes : [],
  }
}

import { formatDate } from './dateFormat'

export function normalizeBackupViewerRow(row = {}) {
  const formattedDate = row.log_date ? formatDate(row.log_date) : null
  return {
    ...row,
    category: 'Operational Backup',
    scope: 'backup',
    entity_type: 'backup_log',
    entity_label: row.system_name || 'Backup',
    docNo: row.system_name || 'Backup',
    action: row.status || 'Recorded',
    details: formattedDate
      ? `[Backup: ${formattedDate}] ${row.notes || ''}`.trim()
      : (row.notes || '—'),
    user: 'System',
    user_email: null,
    field_changes: [],
  }
}
