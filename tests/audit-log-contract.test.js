import test from 'node:test'
import assert from 'node:assert/strict'

test('audit helper module exports contract builders for structured audit logs', async () => {
  const actionModule = await import('../app/actions/audit.js')
  const helperModule = await import('../lib/audit.js')

  assert.equal(typeof helperModule.AUDIT_HIDDEN_FIELDS?.includes, 'function')
  assert.equal(typeof helperModule.buildFieldChanges, 'function')
  assert.equal(typeof helperModule.buildAuditDetails, 'function')
  assert.equal(typeof helperModule.summarizeComplexField, 'function')
  assert.equal(typeof helperModule.buildAuditLogPayload, 'function')
  assert.equal(typeof helperModule.classifyAuditCategory, 'function')
  assert.equal(typeof helperModule.normalizeAuditViewerRow, 'function')
  assert.equal(typeof helperModule.normalizeAdminViewerRow, 'function')
  assert.equal(typeof helperModule.normalizeBackupViewerRow, 'function')
  assert.equal(typeof actionModule.recordEntityAuditLog, 'function')
  assert.equal(typeof actionModule.recordClientAuditLog, 'function')
})

test('buildFieldChanges returns only changed allowlisted fields', async () => {
  const { buildFieldChanges } = await import('../lib/audit.js')

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
  const { buildFieldChanges } = await import('../lib/audit.js')

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
  const { buildFieldChanges } = await import('../lib/audit.js')

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
  const { buildAuditLogPayload } = await import('../lib/audit.js')

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

test('buildFieldChanges covers incident document edit fields with scalar diffs', async () => {
  const { buildFieldChanges } = await import('../lib/audit.js')

  const before = {
    severity: 'Medium',
    reporter_email: 'old@example.com',
    assigned_to_id: 'user-a',
    resolution: 'Restart service',
    root_cause: 'Old cause',
    corrective_action: 'Old action',
  }

  const after = {
    severity: 'High',
    reporter_email: 'new@example.com',
    assigned_to_id: 'user-b',
    resolution: 'Restart service and clear cache',
    root_cause: 'New cause',
    corrective_action: 'New action',
  }

  const result = buildFieldChanges(before, after, ['severity', 'reporter_email', 'assigned_to_id', 'resolution', 'root_cause', 'corrective_action'])

  assert.equal(result.length, 6)
  assert.deepEqual(result[0], { field: 'severity', old_value: 'Medium', new_value: 'High' })
  assert.deepEqual(result[1], { field: 'reporter_email', old_value: 'old@example.com', new_value: 'new@example.com' })
})

test('buildFieldChanges covers checklist edit fields and summarizes complex payloads', async () => {
  const { buildFieldChanges } = await import('../lib/audit.js')

  const result = buildFieldChanges(
    {
      status: null,
      evaluation_result: null,
      evaluation_remark: '',
      start_time: null,
      total_duration_minutes: 5,
      template_data: { photos: ['a'] },
    },
    {
      status: 'OK',
      evaluation_result: 'NG',
      evaluation_remark: 'Need follow-up',
      start_time: '2026-06-05T08:30:00.000Z',
      total_duration_minutes: 25,
      template_data: { photos: ['a', 'b'] },
    },
    ['status', 'evaluation_result', 'evaluation_remark', 'start_time', 'total_duration_minutes', 'template_data']
  )

  assert.equal(result.length, 6)
  assert.deepEqual(result[0], { field: 'status', old_value: null, new_value: 'OK' })
  assert.deepEqual(result[1], { field: 'evaluation_result', old_value: null, new_value: 'NG' })
  assert.equal(result[5].field, 'template_data')
  assert.equal(typeof result[5].summary, 'string')
})

test('buildAuditLogPayload supports settings classifications and field changes', async () => {
  const { buildAuditLogPayload } = await import('../lib/audit.js')

  const payload = buildAuditLogPayload({
    scope: 'settings',
    entityType: 'working_hours',
    entityId: 'working-hours',
    entityLabel: 'Working Hours',
    sourceModule: 'settings_working_hours',
    action: 'Updated',
    before: { start: '08:30', end: '17:30', work_days: [1, 2, 3, 4, 5] },
    after: { start: '09:00', end: '18:00', work_days: [1, 2, 3, 4, 5, 6] },
    allowlist: ['start', 'end', 'work_days'],
  })

  assert.equal(payload.metadata.scope, 'settings')
  assert.equal(payload.metadata.entity_type, 'working_hours')
  assert.equal(payload.metadata.source_module, 'settings_working_hours')
  assert.equal(payload.metadata.field_changes.length, 3)
  assert.equal(payload.metadata.field_changes[2].field, 'work_days')
  assert.equal(typeof payload.metadata.field_changes[2].summary, 'string')
})
