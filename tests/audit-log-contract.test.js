import test from 'node:test'
import assert from 'node:assert/strict'

test('audit helper module exports contract builders for structured audit logs', async () => {
  const auditModule = await import('../app/actions/audit.js')

  assert.equal(typeof auditModule.AUDIT_HIDDEN_FIELDS?.includes, 'function')
  assert.equal(typeof auditModule.buildFieldChanges, 'function')
  assert.equal(typeof auditModule.summarizeComplexField, 'function')
  assert.equal(typeof auditModule.buildAuditLogPayload, 'function')
  assert.equal(typeof auditModule.recordEntityAuditLog, 'function')
})

test('buildFieldChanges returns only changed allowlisted fields', async () => {
  const { buildFieldChanges } = await import('../app/actions/audit.js')

  const before = {
    title: 'Old title',
    severity: 'Medium',
    resolution: 'Restart service',
    ignored_field: 'before value',
  }

  const after = {
    title: 'New title',
    severity: 'Medium',
    resolution: 'Restart service and clear cache',
    ignored_field: 'after value',
  }

  const result = buildFieldChanges(before, after, ['title', 'severity', 'resolution'])

  assert.deepEqual(result, [
    {
      field: 'title',
      old_value: 'Old title',
      new_value: 'New title',
    },
    {
      field: 'resolution',
      old_value: 'Restart service',
      new_value: 'Restart service and clear cache',
    },
  ])
})

test('buildFieldChanges excludes hidden fields from audit output', async () => {
  const { buildFieldChanges } = await import('../app/actions/audit.js')

  const before = {
    signature_pin: 'old-secret',
    otp_code: '123456',
    reporter_email: 'old@example.com',
  }

  const after = {
    signature_pin: 'new-secret',
    otp_code: '654321',
    reporter_email: 'new@example.com',
  }

  const result = buildFieldChanges(before, after, ['signature_pin', 'otp_code', 'reporter_email'])

  assert.deepEqual(result, [
    {
      field: 'reporter_email',
      old_value: 'old@example.com',
      new_value: 'new@example.com',
    },
  ])
})

test('buildFieldChanges summarizes template_data instead of dumping raw json', async () => {
  const { buildFieldChanges } = await import('../app/actions/audit.js')

  const before = {
    template_data: {
      photos: ['photo-1'],
      note: 'before',
    },
  }

  const after = {
    template_data: {
      photos: ['photo-1', 'photo-2'],
      note: 'after',
    },
  }

  const result = buildFieldChanges(before, after, ['template_data'])

  assert.equal(result.length, 1)
  assert.equal(result[0].field, 'template_data')
  assert.equal(typeof result[0].summary, 'string')
  assert.ok(result[0].summary.length > 0)
  assert.equal('old_value' in result[0], false)
  assert.equal('new_value' in result[0], false)
})

test('buildAuditLogPayload always includes audit review metadata', async () => {
  const { buildAuditLogPayload } = await import('../app/actions/audit.js')

  const payload = buildAuditLogPayload({
    scope: 'document',
    entityType: 'incident',
    entityId: 'doc-123',
    entityLabel: 'INC-0001',
    sourceModule: 'incident_detail',
    action: 'Updated',
    details: 'Updated incident fields',
    userEmail: 'user@example.com',
    before: {
      title: 'Before title',
    },
    after: {
      title: 'After title',
    },
    allowlist: ['title'],
  })

  assert.equal(payload.action, 'Updated')
  assert.equal(payload.details, 'Updated incident fields')
  assert.equal(payload.user_email, 'user@example.com')
  assert.equal(payload.metadata.scope, 'document')
  assert.equal(payload.metadata.entity_type, 'incident')
  assert.equal(payload.metadata.entity_id, 'doc-123')
  assert.equal(payload.metadata.entity_label, 'INC-0001')
  assert.equal(payload.metadata.source_module, 'incident_detail')
  assert.deepEqual(payload.metadata.field_changes, [
    {
      field: 'title',
      old_value: 'Before title',
      new_value: 'After title',
    },
  ])
})
