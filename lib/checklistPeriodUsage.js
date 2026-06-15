export function isCancelledUntouchedChecklistDoc(doc, items = []) {
  if (String(doc?.status || '') !== 'Cancelled') return false
  return items.every(item => item?.status == null)
}

export function collectUsedChecklistKeys(periodDocs = [], periodItems = []) {
  const itemsByDocId = new Map()

  for (const item of periodItems) {
    if (!itemsByDocId.has(item.doc_id)) itemsByDocId.set(item.doc_id, [])
    itemsByDocId.get(item.doc_id).push(item)
  }

  const usedKeys = new Set()
  const ignoredDocIds = new Set()

  for (const doc of periodDocs) {
    const docItems = itemsByDocId.get(doc.id) || []
    if (isCancelledUntouchedChecklistDoc(doc, docItems)) {
      ignoredDocIds.add(doc.id)
      continue
    }

    for (const item of docItems) {
      if (item?.item_key) usedKeys.add(item.item_key)
    }
  }

  return { usedKeys, ignoredDocIds }
}
