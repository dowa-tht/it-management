import test from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { readFile } from 'node:fs/promises'

const rootDir = process.cwd()

test('remote modal enforces otp cooldown/limit and two-step flow markers', async () => {
  const source = await readFile(path.join(rootDir, 'components', 'workflow', 'UnifiedApprovalModal.js'), 'utf8')

  assert.match(source, /const OTP_COOLDOWN_SECONDS = 60/)
  assert.match(source, /const OTP_RESEND_LIMIT = 5/)
  assert.match(source, /const \[step, setStep\] = useState\('verify'\)/)
  assert.match(source, /const \[otpCooldownLeft, setOtpCooldownLeft\] = useState\(0\)/)
  assert.match(source, /const \[otpResendCount, setOtpResendCount\] = useState\(0\)/)
  assert.match(source, /if \(otpCooldownLeft > 0\)/)
  assert.match(source, /if \(otpResendCount >= OTP_RESEND_LIMIT\)/)
  assert.match(source, /setOtpCooldownLeft\(OTP_COOLDOWN_SECONDS\)/)
})

test('remote modal includes real-stroke signature validation', async () => {
  const source = await readFile(path.join(rootDir, 'components', 'workflow', 'UnifiedApprovalModal.js'), 'utf8')

  assert.match(source, /const hasRealSignature = \(\) =>/)
  assert.match(source, /sigPad\.current\.toData\(\)/)
  assert.match(source, /if \(Array\.isArray\(stroke\)\) return stroke\.length > 1/)
  assert.match(source, /if \(Array\.isArray\(stroke\?\.points\)\) return stroke\.points\.length > 1/)
  assert.match(source, /กรุณาเซ็นชื่อให้เป็นลายเซ็นที่สมบูรณ์/)
})

test('incident page remote modal uses verify callback and restricts remote approve roles', async () => {
  const source = await readFile(path.join(rootDir, 'app', 'dashboard', 'incidents', '[id]', 'page.js'), 'utf8')

  assert.match(source, /canRemoteApprove = !!\(/)
  assert.match(source, /\['admin', 'it_staff'\]\.includes\(normalizedRole\)/)
  assert.match(source, /onVerifyCode=\{async \(\{ mode, code \}\) =>/)
  assert.match(source, /verifyIncidentApprovalOTP\(id, code\)/)
  assert.match(source, /identityHint=\{!currentStep\?\.approver_id \?/)
})

test('checklist page remote modal uses verify callback and restricts remote approve roles', async () => {
  const source = await readFile(path.join(rootDir, 'app', 'dashboard', 'checklist', '[id]', 'page.js'), 'utf8')

  assert.match(source, /canRemoteApprove = !!\(/)
  assert.match(source, /\['admin', 'it_staff'\]\.includes\(normalizedRole\)/)
  assert.match(source, /onVerifyCode=\{async \(\{ mode, code \}\) =>/)
  assert.match(source, /diagnoseApprovalPin\(id, 'checklist', pendingStep\.id, code\)/)
  assert.match(source, /identityHint=\{!currentStep\?\.approver_id \?/)
})

test('workflow action exposes otp verification endpoint for incident approval', async () => {
  const source = await readFile(path.join(rootDir, 'app', 'actions', 'workflow.js'), 'utf8')

  assert.match(source, /export async function verifyIncidentApprovalOTP\(docId, otp\)/)
  assert.match(source, /verifyIncidentEmailOtp\(supabaseAdmin, incident\?\.reporter_email, otp\)/)
  assert.match(
    source,
    /requestIncidentCancelOTP[\s\S]*requestIncidentEmailOtp\([\s\S]*'cancel'[\s\S]*\)/
  )
  assert.match(
    source,
    /requestIncidentApprovalOTP[\s\S]*requestIncidentEmailOtp\([\s\S]*'approval'[\s\S]*\)/
  )
})
