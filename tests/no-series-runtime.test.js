import test from 'node:test'
import assert from 'node:assert/strict'

import { calculateNextNo } from '../lib/noSeriesRuntime.js'

test('calculateNextNo honors explicit starting_no when the active line has not used any number yet', () => {
  const result = calculateNextNo({
    prefixPart: 'DTT-CHK-2606-',
    hashCount: 3,
    persistedDocNo: 'DTT-CHK-2606-005',
    lastNoUsed: null,
    startingNo: 'DTT-CHK-2606-001',
  })

  assert.equal(result.nextNo, 'DTT-CHK-2606-001')
  assert.equal(result.source, 'starting_no')
})

test('calculateNextNo continues from last_no_used after the line has started running', () => {
  const result = calculateNextNo({
    prefixPart: 'DTT-CHK-2606-',
    hashCount: 3,
    persistedDocNo: 'DTT-CHK-2606-005',
    lastNoUsed: 'DTT-CHK-2606-001',
    startingNo: 'DTT-CHK-2606-001',
  })

  assert.equal(result.nextNo, 'DTT-CHK-2606-002')
  assert.equal(result.source, 'last_no_used')
})

test('calculateNextNo accepts numeric starting_no and expands it with the current prefix', () => {
  const result = calculateNextNo({
    prefixPart: 'DTT-CHK-2607-',
    hashCount: 3,
    persistedDocNo: null,
    lastNoUsed: null,
    startingNo: '7',
  })

  assert.equal(result.nextNo, 'DTT-CHK-2607-007')
  assert.equal(result.source, 'starting_no')
})
