import { supabase } from './supabase'

export function generateNextNo(format, lastNo) {
  const now = new Date()
  const yy = String(now.getFullYear()).slice(2)
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const yyyy = String(now.getFullYear())

  let result = format
    .replace('YYYY', yyyy)
    .replace('YY', yy)
    .replace('MM', mm)

  const hashCount = (format.match(/#/g) || []).length
  if (hashCount === 0) return result

  const prefixPart = result.replace(/#/g, '')
  let nextNum = 1

  if (lastNo) {
    const lastNumStr = lastNo.replace(/[^0-9]/g, '').slice(-hashCount)
    const lastNum = parseInt(lastNumStr) || 0
    nextNum = lastNum + 1
  }

  const numStr = String(nextNum).padStart(hashCount, '0')
  return prefixPart + numStr
}

export async function getNextNo(code) {
  const { data, error } = await supabase
    .from('no_series')
    .select('*')
    .eq('code', code)
    .single()

  if (error || !data) return null

  // เช็ควันที่
  const now = new Date()
  if (data.starting_date && new Date(data.starting_date) > now) return null
  if (data.ending_date && new Date(data.ending_date) < now) return null

  const nextNo = generateNextNo(data.format, data.last_no_used)

  // เช็ค Ending No.
  if (data.ending_no && nextNo > data.ending_no) return null

  let tableName = 'incidents'
  let colName = 'case_number'
  if (code === 'CHK') {
    tableName = 'checklist_docs'
    colName = 'doc_no'
  }

  // เช็คว่าเลขนี้ถูกใช้ไปแล้วหรือยัง (กันเลขซ้ำ)
  const { data: existing } = await supabase
    .from(tableName)
    .select('id')
    .eq(colName, nextNo)
    .maybeSingle()

  if (existing) {
    // เลขซ้ำ ให้ update last_no_used แล้ว generate ใหม่
    await supabase.from('no_series')
      .update({ last_no_used: nextNo })
      .eq('code', code)
    
    // เรียก recursion เพื่อ generate เลขถัดไป
    const updatedData = { ...data, last_no_used: nextNo }
    const retryNo = generateNextNo(data.format, nextNo)
    return { nextNo: retryNo, series: updatedData }
  }

  return { nextNo, series: data }
}

export async function updateLastNo(code, no) {
  await supabase
    .from('no_series')
    .update({
      last_no_used: no,
      last_date_used: new Date().toISOString().split('T')[0]
    })
    .eq('code', code)
}