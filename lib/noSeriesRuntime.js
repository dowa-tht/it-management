const toSequenceFromDocNo = (docNo, hashCount) => {
  if (!docNo || hashCount <= 0) return 0
  const suffix = String(docNo).replace(/[^0-9]/g, '').slice(-hashCount)
  return parseInt(suffix, 10) || 0
}

export const normalizeConfiguredStartNo = (startingNo, prefixPart, hashCount) => {
  if (!startingNo || hashCount <= 0) return null

  const trimmed = String(startingNo).trim()
  if (!trimmed) return null

  if (/^\d+$/.test(trimmed)) {
    return `${prefixPart}${trimmed.padStart(hashCount, '0')}`
  }

  if (!trimmed.startsWith(prefixPart)) return null

  const sequence = toSequenceFromDocNo(trimmed, hashCount)
  if (sequence <= 0) return null

  return `${prefixPart}${String(sequence).padStart(hashCount, '0')}`
}

export function calculateNextNo({
  prefixPart,
  hashCount,
  persistedDocNo = null,
  lastNoUsed = null,
  startingNo = null,
}) {
  const normalizedStartingNo = normalizeConfiguredStartNo(startingNo, prefixPart, hashCount)

  if (normalizedStartingNo && !lastNoUsed) {
    return {
      nextNo: normalizedStartingNo,
      basisNo: null,
      source: 'starting_no',
    }
  }

  const basisNo = lastNoUsed || persistedDocNo
  const nextNum = basisNo && String(basisNo).startsWith(prefixPart)
    ? toSequenceFromDocNo(basisNo, hashCount) + 1
    : 1

  return {
    nextNo: `${prefixPart}${String(nextNum).padStart(hashCount, '0')}`,
    basisNo,
    source: lastNoUsed ? 'last_no_used' : 'persisted_doc',
  }
}
