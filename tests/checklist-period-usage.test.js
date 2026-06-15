import test from 'node:test'
import assert from 'node:assert/strict'

import { collectUsedChecklistKeys, isCancelledUntouchedChecklistDoc } from '../lib/checklistPeriodUsage.js'

test('isCancelledUntouchedChecklistDoc returns true only for cancelled docs whose items are all untouched', () => {
  assert.equal(
    isCancelledUntouchedChecklistDoc(
      { status: 'Cancelled' },
      [{ status: null }, { status: null }]
    ),
    true
  )

  assert.equal(
    isCancelledUntouchedChecklistDoc(
      { status: 'Cancelled' },
      [{ status: 'OK' }]
    ),
    false
  )

  assert.equal(
    isCancelledUntouchedChecklistDoc(
      { status: 'Open' },
      [{ status: null }]
    ),
    false
  )
})

test('collectUsedChecklistKeys ignores cancelled untouched docs but keeps active and touched cancelled docs', () => {
  const periodDocs = [
    { id: 'cancelled-untouched', status: 'Cancelled' },
    { id: 'cancelled-touched', status: 'Cancelled' },
    { id: 'open-doc', status: 'Open' },
  ]

  const periodItems = [
    { doc_id: 'cancelled-untouched', item_key: 'daily-cctv', status: null },
    { doc_id: 'cancelled-touched', item_key: 'm365', status: 'OK' },
    { doc_id: 'open-doc', item_key: 'network', status: null },
  ]

  const { usedKeys, ignoredDocIds } = collectUsedChecklistKeys(periodDocs, periodItems)

  assert.equal(ignoredDocIds.has('cancelled-untouched'), true)
  assert.equal(usedKeys.has('daily-cctv'), false)
  assert.equal(usedKeys.has('m365'), true)
  assert.equal(usedKeys.has('network'), true)
})
