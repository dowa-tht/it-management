import test from 'node:test'
import assert from 'node:assert/strict'

test('normalizeAuditViewerRow exposes structured field changes and category', async () => {
  const { normalizeAuditViewerRow } = await import('../lib/audit.js')

  const row = normalizeAuditViewerRow({
    id: 'audit-1',
    doc_id: 'doc-1',
    doc_type: 'incident',
    action: 'Updated',
    details: 'Updated severity',
    user_email: 'user@example.com',
    metadata: {
      scope: 'document',
      entity_type: 'incident',
      entity_label: 'INC-0001',
      source_module: 'incident_detail',
      field_changes: [{ field: 'severity', old_value: 'Medium', new_value: 'High' }],
    },
  }, 'IT Staff')

  assert.equal(row.category, 'Document Change')
  assert.equal(row.docNo, 'INC-0001')
  assert.equal(row.user, 'IT Staff')
  assert.deepEqual(row.field_changes, [{ field: 'severity', old_value: 'Medium', new_value: 'High' }])
})

test('normalizeAuditViewerRow classifies settings changes separately', async () => {
  const { normalizeAuditViewerRow } = await import('../lib/audit.js')

  const row = normalizeAuditViewerRow({
    id: 'audit-2',
    doc_id: 'settings-1',
    doc_type: 'working_hours',
    action: 'Updated',
    details: 'Updated working hours',
    user_email: 'admin@example.com',
    metadata: {
      scope: 'settings',
      entity_type: 'working_hours',
      entity_label: 'Working Hours',
      field_changes: [{ field: 'start', old_value: '08:30', new_value: '09:00' }],
    },
  })

  assert.equal(row.category, 'Settings Change')
  assert.equal(row.scope, 'settings')
  assert.equal(row.docNo, 'Working Hours')
})

test('normalizeAdminViewerRow maps admin audit logs into viewer contract', async () => {
  const { normalizeAdminViewerRow } = await import('../lib/audit.js')

  const row = normalizeAdminViewerRow({
    id: 'admin-1',
    admin_email: 'admin@example.com',
    target_user_id: 'user-1',
    action: 'UPDATE_USER',
    details: {
      email: 'target@example.com',
      field_changes: [{ field: 'role', old_value: 'employee', new_value: 'auditor' }],
    },
  }, 'Admin User')

  assert.equal(row.category, 'User Admin Action')
  assert.equal(row.docNo, 'target@example.com')
  assert.equal(row.user, 'Admin User')
  assert.equal(row.field_changes.length, 1)
})

test('normalizeBackupViewerRow maps backup logs into operational contract', async () => {
  const { normalizeBackupViewerRow } = await import('../lib/audit.js')

  const row = normalizeBackupViewerRow({
    id: 'backup-1',
    system_name: 'ERP',
    status: 'Completed',
    notes: 'Nightly backup succeeded',
  })

  assert.equal(row.category, 'Operational Backup')
  assert.equal(row.scope, 'backup')
  assert.equal(row.docNo, 'ERP')
  assert.equal(row.action, 'Completed')
  assert.equal(row.details, 'Nightly backup succeeded')
})
