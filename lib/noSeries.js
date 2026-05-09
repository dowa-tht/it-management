import { supabase } from './supabase'

/**
 * Enterprise No. Series Generator
 * @param {string} format - The format string (e.g. DTT-INC-YYMM-###)
 * @param {string} lastNo - The last used number
 * @param {Date} date - The reference date (Working Date)
 */
export function generateNextNo(format, lastNo, date = new Date()) {
  const d = new Date(date)
  const yy = String(d.getFullYear()).slice(2)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = String(d.getFullYear())

  let result = format
    .replace('YYYY', yyyy)
    .replace('YY', yy)
    .replace('MM', mm)

  const hashCount = (format.match(/#/g) || []).length
  if (hashCount === 0) return result

  const prefixPart = result.replace(/#/g, '')
  let nextNum = 1

  if (lastNo) {
    if (lastNo.startsWith(prefixPart)) {
      const lastNumStr = lastNo.replace(/[^0-9]/g, '').slice(-hashCount)
      const lastNum = parseInt(lastNumStr) || 0
      nextNum = lastNum + 1
    } else {
      nextNum = 1
    }
  }

  const numStr = String(nextNum).padStart(hashCount, '0')
  return prefixPart + numStr
}

/**
 * Get the next number for a given series code and date
 * @param {string} code - Series code (e.g. INC, BAK)
 * @param {Date} workingDate - The current working date
 */
export async function getNextNo(code, workingDate = new Date()) {
  const formattedDate = new Date(workingDate).toISOString().split('T')[0]
  
  const { data: line, error } = await supabase
    .from('no_series_lines')
    .select('*, no_series(format, linked_form)')
    .eq('series_code', code)
    .lte('starting_date', formattedDate)
    .order('starting_date', { ascending: false })
    .limit(1)
    .single()

  let formatToUse = null
  let lastNoUsed = null
  let lineId = null
  let isLegacy = false
  let headerData = null

  // Fallback to old header logic if no lines found
  if (error || !line) {
    const { data: header } = await supabase.from('no_series').select('*').eq('code', code).single()
    if (!header) return null
    formatToUse = header.format
    lastNoUsed = header.last_no_used
    isLegacy = true
    headerData = header
  } else {
    // Format Override: Use line.format if available, else fallback to header format
    formatToUse = line.format || (line.no_series ? line.no_series.format : null)
    if (!formatToUse) {
      // Final fallback to header if join failed or no format found
      const { data: header } = await supabase.from('no_series').select('*').eq('code', code).single()
      formatToUse = header?.format || `${code}-YYMM-###`
      isLegacy = true
      headerData = header
    }
    lastNoUsed = line.last_no_used
    lineId = line.id
  }

  const d = new Date(workingDate)
  const yy = String(d.getFullYear()).slice(2)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = String(d.getFullYear())

  let replacedFormat = formatToUse.replace('YYYY', yyyy).replace('YY', yy).replace('MM', mm)
  const hashCount = (replacedFormat.match(/#/g) || []).length

  if (hashCount === 0) {
     return { nextNo: replacedFormat, series: isLegacy ? headerData : line, isLegacy }
  }

  const prefixPart = replacedFormat.replace(/#/g, '')

  let tableName = 'incidents'
  let colName = 'case_number'
  if (code === 'CHK') { tableName = 'checklist_docs'; colName = 'doc_no'; }
  if (code === 'BAK') { tableName = 'backup_logs'; colName = 'doc_no'; }

  // Auto-Max Single Query Optimization
  const { data: maxRecord } = await supabase
    .from(tableName)
    .select(colName)
    .like(colName, `${prefixPart}%`)
    .order(colName, { ascending: false })
    .limit(1)
    .maybeSingle()

  let nextNum = 1
  if (maxRecord && maxRecord[colName]) {
    const lastNumStr = maxRecord[colName].replace(/[^0-9]/g, '').slice(-hashCount)
    nextNum = (parseInt(lastNumStr) || 0) + 1
  } else if (lastNoUsed && lastNoUsed.startsWith(prefixPart)) {
    const lastNumStr = lastNoUsed.replace(/[^0-9]/g, '').slice(-hashCount)
    nextNum = (parseInt(lastNumStr) || 0) + 1
  }

  const numStr = String(nextNum).padStart(hashCount, '0')
  const nextNo = prefixPart + numStr

  // Background update (fire and forget) to keep setup UI in sync
  if (!isLegacy && lineId) {
    supabase.from('no_series_lines').update({ last_no_used: nextNo }).eq('id', lineId).then()
  } else if (isLegacy && headerData) {
    supabase.from('no_series').update({ last_no_used: nextNo }).eq('id', headerData.id).then()
  }

  return { nextNo, series: isLegacy ? headerData : line, isLegacy }
}

/**
 * Update the last number used on the specific line
 */
export async function updateLastNo(code, no, lineId = null) {
  if (lineId) {
    await supabase
      .from('no_series_lines')
      .update({
        last_no_used: no,
        last_date_used: new Date().toISOString()
      })
      .eq('id', lineId)
  } else {
    // Legacy fallback
    await supabase
      .from('no_series')
      .update({
        last_no_used: no,
        last_date_used: new Date().toISOString().split('T')[0]
      })
      .eq('code', code)
  }
}