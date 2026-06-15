import test from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { readFile } from 'node:fs/promises'

const rootDir = process.cwd()

test('new incident page persists reporter_email in form state and UserAutocomplete callback', async () => {
  const source = await readFile(path.join(rootDir, 'app', 'dashboard', 'incidents', 'new', 'page.js'), 'utf8')

  assert.match(source, /reporter_email:\s*''/)
  assert.match(source, /reporter_email:\s*profile\.email\s*\|\|\s*user\.email\s*\|\|\s*''/)
  assert.match(source, /reporter_email:\s*u\?\.email\s*\|\|\s*''/)
})

test('unified approval modal supports OTP verification mode via onRequestOtp callback', async () => {
  const source = await readFile(path.join(rootDir, 'components', 'workflow', 'UnifiedApprovalModal.js'), 'utf8')

  assert.match(source, /verificationMode\s*=\s*'pin'/)
  assert.match(source, /onRequestOtp\s*=\s*null/)
  assert.match(source, /otp:\s*needPin\s*&&\s*verificationMode\s*===\s*'otp'\s*\?\s*pin\s*:\s*null/)
  assert.match(source, /const result = await onRequestOtp\(\)/)
})

test('workflow submitApprovalStep accepts otp and verifies external reporter step via incident email otp', async () => {
  const source = await readFile(path.join(rootDir, 'app', 'actions', 'workflow.js'), 'utf8')

  assert.match(source, /submitApprovalStep\(docId,\s*docType,\s*stepId,\s*signatureData,\s*comment\s*=\s*'',\s*pin\s*=\s*null,\s*overrideApproverId\s*=\s*null,\s*otp\s*=\s*null\)/)
  assert.match(source, /const isExternalReporterStep = Boolean\(isIncidentReporterStep && !docData\?\.reported_by_id\)/)
  assert.match(source, /const otpCheck = await verifyIncidentEmailOtp\(supabaseAdmin,\s*docData\?\.reporter_email,\s*otp\)/)
  assert.match(source, /\[Verify by OTP\]/)
})

test('workflow cancelDocument does not hardcode incident-only reporter fields into checklist queries', async () => {
  const source = await readFile(path.join(rootDir, 'app', 'actions', 'workflow.js'), 'utf8')

  assert.match(source, /export async function cancelDocument\(docId,\s*docType,\s*reason,\s*verification = null\)/)
  assert.match(source, /\.from\(reg\.table\)\s*[\r\n\s]*\.select\('\*'\)\s*[\r\n\s]*\.eq\('id', docId\)/)
  assert.doesNotMatch(source, /\.select\(`\*,\s*reported_by_id,\s*reporter_email,\s*reported_by,\s*created_by_id,\s*\$\{reg\.no_field\}`\)/)
})

test('legacy quickAddUser path is explicitly disabled', async () => {
  const source = await readFile(path.join(rootDir, 'app', 'actions', 'users.js'), 'utf8')

  assert.match(source, /Quick Add แบบสร้างบัญชีถาวรถูกปิดใช้งานแล้ว/)
})
