import test from 'node:test'
import assert from 'node:assert/strict'

test('qr lookup route source keeps guard clause before Supabase access', async () => {
  const { readFile } = await import('node:fs/promises')
  const source = await readFile(new URL('../app/api/qr/lookup/route.js', import.meta.url), 'utf8')

  const missingParamIndex = source.indexOf("if (!qrValue)")
  const supabaseIndex = source.indexOf('const supabase = getSupabaseAdmin()')

  assert.notEqual(missingParamIndex, -1)
  assert.notEqual(supabaseIndex, -1)
  assert.ok(missingParamIndex < supabaseIndex)
  assert.match(source, /status:\s*400/)
  assert.match(source, /qr_value is required/)
})

test('qr lookup route source includes not found and success branches', async () => {
  const { readFile } = await import('node:fs/promises')
  const source = await readFile(new URL('../app/api/qr/lookup/route.js', import.meta.url), 'utf8')

  assert.match(source, /Target not found/)
  assert.match(source, /status:\s*404/)
  assert.match(source, /success:\s*true/)
  assert.match(source, /NextResponse\.json/)
})
