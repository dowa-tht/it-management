import { supabase } from './supabase'

// Generate เลขถัดไปจาก Format
export function generateNextNo(format, lastNo, lastDate) {
  const now = new Date()
  const yy = String(now.getFullYear()).slice(2)
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const yyyy = String(now.getFullYear())

  // แทนที่ตัวแปรใน format
  let prefix = format
    .replace('YYYY', yyyy)
    .replace('YY', yy)
    .replace('MM', mm)

  // หาจำนวน # เพื่อกำหนดความยาวเลข
  const hashCount = (format.match(/#/g) || []).length
  if (hashCount === 0) return prefix

  // ตัด prefix ออกจาก format เพื่อหาส่วนตัวเลข
  const prefixPart = prefix.replace(/#/g, '')

  // หาเลขถัดไป
  let nextNum = 1
  if (lastNo) {
    // ดึงเฉพาะส่วนตัวเลขท้ายสุด
    const lastNumStr = lastNo.replace(/[^0-9]/g, '').slice(-hashCount)
    const lastNum = parseInt(lastNumStr) || 0
    nextNum = lastNum + 1
  }

  const numStr = String(nextNum).padStart(hashCount, '0')
  return prefixPart + numStr
}

// ดึง No. Series และ Generate เลขถัดไป
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

  const nextNo = generateNextNo(data.format, data.last_no_used, data.last_date_used)

  // เช็ค Ending No.
  if (data.ending_no && nextNo > data.ending_no) return null

  return { nextNo, series: data }
}

// อัปเดต Last No. Used หลังสร้างเอกสาร
export async function updateLastNo(code, no) {
  await supabase
    .from('no_series')
    .update({
      last_no_used: no,
      last_date_used: new Date().toISOString().split('T')[0]
    })
    .eq('code', code)
}