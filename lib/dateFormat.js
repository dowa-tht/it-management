const MONTHS_TH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function formatDate(dateStr, lang = 'en') {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d)) return '—'
  const day = String(d.getDate()).padStart(2, '0')
  const month = lang === 'th' ? MONTHS_TH[d.getMonth()] : MONTHS_EN[d.getMonth()]
  const year = lang === 'th' ? d.getFullYear() + 543 : d.getFullYear()
  return `${day}-${month}-${year}`
}

export function formatDateTime(dateStr, lang = 'en') {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d)) return '—'
  const day = String(d.getDate()).padStart(2, '0')
  const month = lang === 'th' ? MONTHS_TH[d.getMonth()] : MONTHS_EN[d.getMonth()]
  const year = lang === 'th' ? d.getFullYear() + 543 : d.getFullYear()
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${day}-${month}-${year} ${hh}:${mm}`
}