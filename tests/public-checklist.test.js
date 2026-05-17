import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.join(__dirname, '..')

test('public checklist action source implements required public behavior', () => {
  const codePath = path.join(rootDir, 'app', 'actions', 'public-checklist.js')
  const code = fs.readFileSync(codePath, 'utf8')

  // Check no requireAdminProfile
  assert.ok(!code.includes('requireAdminProfile'), 'Public API must not require admin profile')

  // Check basic methods exist
  assert.ok(code.includes('resolveChecklistQrPublic'), 'Must export resolveChecklistQrPublic')
  assert.ok(code.includes('getTargetPointHistoryPublic'), 'Must export getTargetPointHistoryPublic')

  // Check sanitization
  assert.ok(code.includes('PUBLIC_TARGET_SELECT'), 'Must define public target select fields')
})
