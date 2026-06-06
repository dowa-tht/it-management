'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { recordClientAuditLog } from '@/app/actions/audit'
import { ActionButton } from '@/app/dashboard/checklist/components/ActionButton'

const MONTHS_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const WEEKDAY_TH = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DEFAULT_WORKING_DAYS = [1, 2, 3, 4, 5]

const CARD_SHADOW = '0 20px 35px -24px rgba(15, 23, 42, 0.35)'
const FLOATING_SHADOW = '0 24px 50px -24px rgba(15, 23, 42, 0.28)'

const baseCardStyle = {
  background: 'rgba(255, 255, 255, 0.92)',
  border: '1px solid rgba(226, 232, 240, 0.95)',
  borderRadius: 24,
  boxShadow: CARD_SHADOW,
  backdropFilter: 'blur(16px)',
}

const inputStyle = {
  width: '100%',
  minHeight: 44,
  padding: '11px 14px',
  border: '1px solid #dbe2ea',
  borderRadius: 14,
  background: '#ffffff',
  color: '#0f172a',
  fontSize: 14,
  outline: 'none',
}

const secondaryButtonStyle = {
  border: '1px solid #dbe2ea',
  background: '#ffffff',
  color: '#334155',
  borderRadius: 14,
  padding: '10px 14px',
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
}

const primaryButtonStyle = {
  border: 'none',
  borderRadius: 14,
  padding: '11px 14px',
  background: 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)',
  color: '#ffffff',
  fontSize: 13,
  fontWeight: 800,
  cursor: 'pointer',
  boxShadow: '0 16px 30px -18px rgba(29, 78, 216, 0.85)',
}

function SurfaceCard({ children, style }) {
  return <div style={{ ...baseCardStyle, ...style }}>{children}</div>
}

function StatCard({ eyebrow, value, subtitle, accent, tint }) {
  return (
    <SurfaceCard
      style={{
        padding: 18,
        background: tint || 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.96) 100%)',
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: accent }}>{eyebrow}</div>
      <div style={{ fontSize: 30, fontWeight: 800, color: '#0f172a', marginTop: 10, lineHeight: 1 }}>{value}</div>
      <div style={{ marginTop: 10, fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>{subtitle}</div>
    </SurfaceCard>
  )
}

function SectionTitle({ title, subtitle, action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
      <div>
        <div style={{ fontSize: 17, fontWeight: 800, color: '#0f172a' }}>{title}</div>
        {subtitle ? <div style={{ marginTop: 4, fontSize: 13, color: '#64748b' }}>{subtitle}</div> : null}
      </div>
      {action}
    </div>
  )
}

function Badge({ label, tone }) {
  const styles = {
    blue: { background: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
    green: { background: '#ecfdf5', color: '#047857', border: '#a7f3d0' },
    amber: { background: '#fffbeb', color: '#b45309', border: '#fde68a' },
    slate: { background: '#f8fafc', color: '#475569', border: '#e2e8f0' },
  }

  const theme = styles[tone] || styles.slate

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 10px',
        borderRadius: 999,
        border: `1px solid ${theme.border}`,
        background: theme.background,
        color: theme.color,
        fontSize: 12,
        fontWeight: 700,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  )
}

const toIsoDate = (year, monthIndex, day) => {
  const month = String(monthIndex + 1).padStart(2, '0')
  const d = String(day).padStart(2, '0')
  return `${year}-${month}-${d}`
}

const formatDateDisplay = (dateStr) => {
  if (!dateStr) return '-'
  const [year, month, day] = dateStr.split('-')
  const monthIndex = Number(month) - 1
  return `${day} / ${MONTHS_SHORT[monthIndex] || month} / ${year}`
}

const normalizeHolidayDate = (dateValue) => {
  if (!dateValue) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) return dateValue

  const parts = dateValue.split(/[\/\s-]+/).filter(Boolean)
  if (parts.length !== 3) return dateValue

  let [d, m, y] = parts
  const monthIndex = MONTHS_SHORT.findIndex((month) => month.toLowerCase() === m.toLowerCase())
  if (monthIndex !== -1) m = String(monthIndex + 1)
  if (Number(y) > 2400) y = String(Number(y) - 543)

  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function buildMonthGrid(year, monthIndex) {
  const firstDay = new Date(year, monthIndex, 1).getDay()
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
  const cells = []

  for (let i = 0; i < firstDay; i += 1) cells.push(null)
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(day)
  while (cells.length % 7 !== 0) cells.push(null)

  return cells
}

function getMonthAccent(monthIndex) {
  const accents = [
    { solid: '#0f766e', soft: '#ccfbf1' },
    { solid: '#1d4ed8', soft: '#dbeafe' },
    { solid: '#7c3aed', soft: '#ede9fe' },
    { solid: '#0891b2', soft: '#cffafe' },
    { solid: '#15803d', soft: '#dcfce7' },
    { solid: '#2563eb', soft: '#dbeafe' },
    { solid: '#0f766e', soft: '#ccfbf1' },
    { solid: '#b45309', soft: '#fef3c7' },
    { solid: '#be123c', soft: '#ffe4e6' },
    { solid: '#7c2d12', soft: '#fed7aa' },
    { solid: '#4338ca', soft: '#e0e7ff' },
    { solid: '#166534', soft: '#dcfce7' },
  ]

  return accents[monthIndex] || accents[0]
}

export default function HolidaysPage() {
  const today = useMemo(() => new Date(), [])
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState({ text: '', type: '' })
  const [viewMode, setViewMode] = useState('month')
  const [selectedYear, setSelectedYear] = useState(today.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth())
  const [searchTerm, setSearchTerm] = useState('')
  const [workingDays, setWorkingDays] = useState(DEFAULT_WORKING_DAYS)
  const [newHolidayDate, setNewHolidayDate] = useState('')
  const [newHolidayDesc, setNewHolidayDesc] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editDate, setEditDate] = useState('')
  const [editValue, setEditValue] = useState('')
  const [showGuide, setShowGuide] = useState(false)
  const [guideContent, setGuideContent] = useState('')
  const [editingGuide, setEditingGuide] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const isReadOnlyAuditor = currentUser?.role === 'auditor'

  async function fetchData() {
    setLoading(true)
    await Promise.all([fetchItems(), fetchWorkingHours(), fetchGuide(), checkUser()])
    setLoading(false)
  }

  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
  useEffect(() => {
    fetchData()
  }, [])
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

  async function checkUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return
    const { data: profile } = await supabase.from('user_profiles').select('*').eq('id', user.id).single()
    setCurrentUser(profile)
  }

  async function fetchGuide() {
    const { data } = await supabase.from('system_settings').select('value').eq('key', 'holidays_guide_content').single()
    if (data?.value) {
      setGuideContent(data.value)
      return
    }

    setGuideContent(`### 🌴 การจัดการวันหยุดประจำปี (Holidays)
ใช้กำหนดวันหยุดที่ต้องไม่นับรวมในการคำนวณ SLA และ Working Time

---
#### 1. ปฏิทินรายเดือนและรายปี
- สลับมุมมองเป็นรายเดือนหรือรายปีได้
- มุมมองรายเดือนจะแสดงวันทำงานตาม Working Hours
- มุมมองรายปีจะแสดงจำนวนวันหยุดของแต่ละเดือน

---
#### 2. การเพิ่มวันหยุด
- คลิกวันที่ในปฏิทินหรือเลือกจากช่องวันที่
- กรอกชื่อวันหยุด
- กด Add Holiday

---
#### 3. การนำเข้า CSV
- ใช้ Template เพื่อจัดรูปแบบข้อมูล
- คอลัมน์ที่ต้องมีคือ holiday_date และ description
- รูปแบบวันที่ควรเป็น YYYY-MM-DD`)
  }

  async function fetchItems() {
    const { data, error } = await supabase.from('holidays').select('*').order('holiday_date', { ascending: true })
    if (error) {
      setMsg({ text: `Error: ${error.message}`, type: 'error' })
      return
    }
    setItems(data || [])
  }

  async function fetchWorkingHours() {
    const { data } = await supabase.from('system_settings').select('value').eq('key', 'working_hours').single()
    if (!data?.value?.work_days || !Array.isArray(data.value.work_days)) return
    setWorkingDays(data.value.work_days)
  }

  const handleSaveGuide = async () => {
    setSaving(true)
    const { error } = await supabase.from('system_settings').upsert({ key: 'holidays_guide_content', value: guideContent, updated_at: new Date().toISOString() })
    if (error) setMsg({ text: `Error: ${error.message}`, type: 'error' })
    else {
      setMsg({ text: 'บันทึกคู่มือสำเร็จ', type: 'success' })
      setEditingGuide(false)
    }
    setSaving(false)
  }

  const handleAddHoliday = async () => {
    if (!newHolidayDate || !newHolidayDesc.trim()) return
    setSaving(true)
    const normalized = normalizeHolidayDate(newHolidayDate)
    const nextHoliday = { holiday_date: normalized, description: newHolidayDesc.trim() }
    const { error } = await supabase.from('holidays').insert([{ holiday_date: normalized, description: newHolidayDesc.trim() }])
    if (error) setMsg({ text: `Error: ${error.message}`, type: 'error' })
    else {
      await recordClientAuditLog({
        scope: 'settings',
        entityType: 'holiday',
        entityId: `holiday:${normalized}`,
        entityLabel: nextHoliday.description,
        sourceModule: 'settings_holidays',
        action: 'Created',
        details: 'Added holiday',
        before: {},
        after: nextHoliday,
        allowlist: ['holiday_date', 'description'],
      })
      setNewHolidayDate('')
      setNewHolidayDesc('')
      setMsg({ text: 'เพิ่มวันหยุดสำเร็จ', type: 'success' })
      await fetchItems()
    }
    setSaving(false)
  }

  const handleUpdateHoliday = async (id) => {
    if (!editDate || !editValue.trim()) return
    setSaving(true)
    const currentItem = items.find((item) => item.id === id)
    const { error } = await supabase.from('holidays').update({ holiday_date: editDate, description: editValue.trim() }).eq('id', id)
    if (error) setMsg({ text: `Error: ${error.message}`, type: 'error' })
    else {
      await recordClientAuditLog({
        scope: 'settings',
        entityType: 'holiday',
        entityId: id,
        entityLabel: editValue.trim(),
        sourceModule: 'settings_holidays',
        action: 'Updated',
        details: 'Updated holiday',
        before: currentItem || {},
        after: { ...(currentItem || {}), holiday_date: editDate, description: editValue.trim() },
        allowlist: ['holiday_date', 'description'],
      })
      setEditingId(null)
      setMsg({ text: 'อัปเดตข้อมูลสำเร็จ', type: 'success' })
      await fetchItems()
    }
    setSaving(false)
  }

  const handleDelete = async (id, description) => {
    if (!confirm(`ลบ "${description}"?`)) return
    const currentItem = items.find((item) => item.id === id)
    const { error } = await supabase.from('holidays').delete().eq('id', id)
    if (error) setMsg({ text: `Error: ${error.message}`, type: 'error' })
    else {
      await recordClientAuditLog({
        scope: 'settings',
        entityType: 'holiday',
        entityId: id,
        entityLabel: description,
        sourceModule: 'settings_holidays',
        action: 'Deleted',
        details: 'Deleted holiday',
        before: currentItem || {},
        after: {},
        allowlist: ['holiday_date', 'description'],
      })
      setMsg({ text: 'ลบวันหยุดสำเร็จ', type: 'success' })
      await fetchItems()
    }
  }

  const handleImportCSV = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (event) => {
      const csv = String(event.target?.result || '')
      const lines = csv.split('\n')
      const records = lines
        .slice(1)
        .filter((line) => line.trim())
        .map((line) => {
          const [date, desc] = line.split(',')
          return {
            holiday_date: normalizeHolidayDate((date || '').trim()),
            description: (desc || '').trim(),
          }
        })
        .filter((record) => record.holiday_date && record.description)

      if (!records.length) {
        setMsg({ text: 'ไม่พบข้อมูลในไฟล์ CSV', type: 'error' })
        return
      }

      setSaving(true)
      const { error } = await supabase.from('holidays').insert(records)
      if (error) setMsg({ text: `Error: ${error.message}`, type: 'error' })
      else {
        await recordClientAuditLog({
          scope: 'settings',
          entityType: 'holiday',
          entityId: `holiday-import:${records.length}`,
          entityLabel: 'Holiday CSV Import',
          sourceModule: 'settings_holidays',
          action: 'Imported',
          details: `Imported ${records.length} holidays`,
          before: { records_count: 0 },
          after: { records_count: records.length, sample_records: records.slice(0, 3) },
          allowlist: ['records_count', 'sample_records'],
          metadata: {
            diffOptions: {
              summarizeFields: ['sample_records'],
            },
          },
        })
        setMsg({ text: `Imported ${records.length} holidays`, type: 'success' })
        await fetchItems()
      }
      setSaving(false)
    }
    reader.readAsText(file)
  }

  const downloadCSVTemplate = () => {
    const csv = "holiday_date,description\n2026-01-01,New Year's Day"
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'holiday_template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const holidayMap = useMemo(() => {
    const map = new Map()
    items.forEach((item) => {
      if (!map.has(item.holiday_date)) map.set(item.holiday_date, [])
      map.get(item.holiday_date).push(item)
    })
    return map
  }, [items])

  const yearOptions = useMemo(() => {
    const years = new Set([today.getFullYear()])
    items.forEach((item) => {
      const year = Number(item.holiday_date?.split('-')[0])
      if (year) years.add(year)
    })
    return [...years].sort((a, b) => b - a)
  }, [items, today])

  const monthGrid = useMemo(() => buildMonthGrid(selectedYear, selectedMonth), [selectedYear, selectedMonth])

  const monthlyItems = useMemo(() => {
    return items.filter((item) => {
      const [year, month] = item.holiday_date.split('-').map(Number)
      const inMonth = year === selectedYear && month === selectedMonth + 1
      if (!inMonth) return false
      if (!searchTerm) return true
      const text = `${item.description} ${item.holiday_date}`.toLowerCase()
      return text.includes(searchTerm.toLowerCase())
    })
  }, [items, searchTerm, selectedMonth, selectedYear])

  const yearSummary = useMemo(() => {
    return Array.from({ length: 12 }).map((_, monthIndex) => {
      const monthItems = items.filter((item) => {
        const [year, month] = item.holiday_date.split('-').map(Number)
        return year === selectedYear && month === monthIndex + 1
      })
      return { monthIndex, monthItems }
    })
  }, [items, selectedYear])

  const workingDaySet = useMemo(() => new Set(workingDays), [workingDays])

  const workingDaysLabel = useMemo(() => {
    return workingDays
      .slice()
      .sort((a, b) => a - b)
      .map((day) => WEEKDAY_TH[day])
      .join(', ')
  }, [workingDays])

  const selectedMonthLabel = `${MONTHS_FULL[selectedMonth]} ${selectedYear}`
  const selectedMonthHolidayCount = monthlyItems.length
  const totalYearHolidays = yearSummary.reduce((sum, month) => sum + month.monthItems.length, 0)
  const monthsWithHoliday = yearSummary.filter((month) => month.monthItems.length > 0).length
  const selectedDateItems = newHolidayDate ? holidayMap.get(newHolidayDate) || [] : []

  const nextHoliday = useMemo(() => {
    const todayIso = toIsoDate(today.getFullYear(), today.getMonth(), today.getDate())
    return items.find((item) => item.holiday_date >= todayIso) || items[0] || null
  }, [items, today])

  const busiestMonth = useMemo(() => {
    return yearSummary.reduce(
      (best, current) => (current.monthItems.length > best.monthItems.length ? current : best),
      { monthIndex: selectedMonth, monthItems: [] }
    )
  }, [selectedMonth, yearSummary])

  const stepMonth = (direction) => {
    const base = new Date(selectedYear, selectedMonth + direction, 1)
    setSelectedYear(base.getFullYear())
    setSelectedMonth(base.getMonth())
  }

  const openMonth = (monthIndex) => {
    setSelectedMonth(monthIndex)
    setViewMode('month')
  }

  const jumpToToday = () => {
    setSelectedYear(today.getFullYear())
    setSelectedMonth(today.getMonth())
    setViewMode('month')
  }

  return (
    <div
      className="holidays-container"
      style={{
        minHeight: '100vh',
        padding: 'var(--page-padding, 24px)',
        paddingBottom: 60,
        background:
          'radial-gradient(circle at top left, rgba(14, 165, 233, 0.12), transparent 24%), radial-gradient(circle at top right, rgba(16, 185, 129, 0.12), transparent 28%), linear-gradient(180deg, #f8fbff 0%, #f8fafc 56%, #f1f5f9 100%)',
      }}
    >
      <style>{`
        :root { --page-padding: 24px; }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        * { box-sizing: border-box; }
        .holiday-animate { animation: fadeInUp 0.35s ease-out; }
        .holiday-page-shell { max-width: 1280px; margin: 0 auto; }
        .holiday-summary-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; margin-bottom: 18px; }
        .holiday-top-grid { display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 18px; align-items: start; }
        .holiday-year-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
        .holiday-mini-grid { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 6px; }
        .holiday-toolbar { display: flex; gap: 12px; margin-bottom: 18px; align-items: center; flex-wrap: wrap; }
        .holiday-header { display: flex; justify-content: space-between; align-items: center; gap: 20px; margin-bottom: 22px; flex-wrap: wrap; }
        .holiday-action-dock { display: flex; gap: 8px; padding: 6px; background: rgba(255,255,255,0.94); border: 1px solid rgba(226,232,240,0.95); border-radius: 20px; box-shadow: ${CARD_SHADOW}; }
        .holiday-action-dock > * { display: inline-flex; align-items: center; justify-content: center; }
        .holiday-segment { display: inline-flex; padding: 4px; background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; }
        .holiday-segment button { border: none; border-radius: 10px; padding: 9px 14px; background: transparent; font-size: 13px; font-weight: 700; color: #475569; cursor: pointer; }
        .holiday-segment .active { background: linear-gradient(135deg, #dbeafe 0%, #eff6ff 100%); color: #1d4ed8; box-shadow: inset 0 0 0 1px rgba(191, 219, 254, 0.9); }
        .holiday-calendar-cell { transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease; }
        .holiday-calendar-cell:hover { transform: translateY(-2px); box-shadow: 0 16px 24px -20px rgba(15, 23, 42, 0.65); }
        .holiday-month-list { display: grid; gap: 10px; max-height: 360px; overflow-y: auto; padding-right: 4px; }
        .holiday-month-list::-webkit-scrollbar { width: 8px; }
        .holiday-month-list::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 999px; }
        .holiday-guide-dialog { width: min(860px, calc(100vw - 24px)); max-height: 90vh; }
        @media (max-width: 1120px) {
          .holiday-summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .holiday-top-grid { grid-template-columns: 1fr; }
          .holiday-year-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
        @media (max-width: 768px) {
          :root { --page-padding: 12px; }
          .holiday-header { align-items: stretch; }
          .holiday-action-dock { width: 100%; }
          .holiday-action-dock > * { flex: 1; }
          .holiday-toolbar { flex-direction: column; align-items: stretch; }
          .holiday-summary-grid { grid-template-columns: 1fr; }
          .holiday-year-grid { grid-template-columns: 1fr; }
          .holiday-mini-grid { gap: 4px; }
          .holiday-mobile-stack { grid-template-columns: 1fr !important; }
          .holiday-guide-dialog { width: calc(100vw - 16px); }
          .holiday-title { font-size: 22px !important; }
        }
      `}</style>

      <div className="holiday-page-shell">
        <div className="holiday-header holiday-animate">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  background: 'linear-gradient(135deg, #0ea5e9 0%, #22c55e 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontSize: 22,
                  boxShadow: '0 18px 30px -18px rgba(14, 165, 233, 0.95)',
                }}
              >
                📅
              </div>
              <h1
                className="holiday-title"
                style={{ margin: 0, fontSize: 28, fontWeight: 800, color: '#0f172a', letterSpacing: '0', display: 'flex', alignItems: 'center', gap: 12 }}
              >
                Holidays Calendar
                <button
                  data-readonly-allowed="true"
                  onClick={() => setShowGuide(true)}
                  style={{ border: 'none', background: '#eff6ff', width: 34, height: 34, borderRadius: 10, cursor: 'pointer', fontSize: 18 }}
                  title="Guide"
                >
                  📖
                </button>
              </h1>
            </div>
            <p style={{ margin: 0, maxWidth: 760, color: '#64748b', fontSize: 15, lineHeight: 1.7 }}>
              มุมมองปฏิทินสำหรับจัดการวันหยุดประจำปีแบบอ่านง่ายขึ้น พร้อมสรุปภาพรวม, วันทำงานจาก Working Hours และ workflow เดิมสำหรับเพิ่ม แก้ไข ลบ และ import CSV
            </p>
          </div>

          <div className="holiday-action-dock">
            <button data-readonly-allowed="true" onClick={jumpToToday} style={secondaryButtonStyle}>Today</button>
            <button data-readonly-allowed="true" onClick={downloadCSVTemplate} style={secondaryButtonStyle}>📄 Template</button>
            {isReadOnlyAuditor ? (
              <div
                style={{
                  ...primaryButtonStyle,
                  background: 'linear-gradient(135deg, #94a3b8 0%, #cbd5e1 100%)',
                  boxShadow: 'none',
                  opacity: 0.7,
                  cursor: 'not-allowed',
                }}
              >
                📥 Import CSV
              </div>
            ) : (
              <label
                style={{
                  ...primaryButtonStyle,
                  background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                  boxShadow: '0 16px 30px -18px rgba(5, 150, 105, 0.85)',
                }}
              >
                📥 Import CSV
                <input type="file" accept=".csv" onChange={handleImportCSV} style={{ display: 'none' }} />
              </label>
            )}
          </div>
        </div>

        {msg.text ? (
          <div
            className="holiday-animate"
            style={{
              padding: '14px 18px',
              marginBottom: 18,
              borderRadius: 18,
              border: `1px solid ${msg.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
              background: msg.type === 'success' ? '#f0fdf4' : '#fef2f2',
              color: msg.type === 'success' ? '#166534' : '#991b1b',
              fontSize: 13,
              fontWeight: 700,
              boxShadow: CARD_SHADOW,
            }}
          >
            {msg.text}
          </div>
        ) : null}

        <div className="holiday-summary-grid holiday-animate">
          <StatCard eyebrow="Selected Month" value={selectedMonthHolidayCount} subtitle={`${selectedMonthLabel} มีวันหยุดที่ค้นพบ ${selectedMonthHolidayCount} รายการ`} accent="#0284c7" tint="linear-gradient(180deg, rgba(239,246,255,0.95) 0%, rgba(255,255,255,0.98) 100%)" />
          <StatCard eyebrow="Year Overview" value={totalYearHolidays} subtitle={`ปี ${selectedYear} มีวันหยุดรวม ${totalYearHolidays} วัน`} accent="#2563eb" tint="linear-gradient(180deg, rgba(237,242,255,0.92) 0%, rgba(255,255,255,0.98) 100%)" />
          <StatCard eyebrow="Working Days" value={workingDays.length} subtitle={workingDaysLabel || 'ยังไม่ได้ตั้งค่า working days'} accent="#059669" tint="linear-gradient(180deg, rgba(236,253,245,0.96) 0%, rgba(255,255,255,0.98) 100%)" />
          <StatCard eyebrow="Busiest Month" value={MONTHS_SHORT[busiestMonth.monthIndex]} subtitle={busiestMonth.monthItems.length ? `${busiestMonth.monthItems.length} holidays มากที่สุดในปีนี้` : 'ยังไม่มีข้อมูลวันหยุดในปีนี้'} accent="#b45309" tint="linear-gradient(180deg, rgba(255,247,237,0.96) 0%, rgba(255,255,255,0.98) 100%)" />
        </div>

        <div className="holiday-animate">
          <SurfaceCard style={{ padding: 18, marginBottom: 18, overflow: 'hidden' }}>
          <div className="holiday-toolbar">
            <div className="holiday-segment">
              <button data-readonly-allowed="true" onClick={() => setViewMode('month')} className={viewMode === 'month' ? 'active' : ''}>Month View</button>
              <button data-readonly-allowed="true" onClick={() => setViewMode('year')} className={viewMode === 'year' ? 'active' : ''}>Year View</button>
            </div>

            <select data-readonly-allowed="true" value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} style={{ ...inputStyle, width: 140, minWidth: 140 }}>
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>

            <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
              <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 14 }}>🔍</span>
              <input
                data-readonly-allowed="true"
                placeholder="ค้นหาวันหยุดจากชื่อหรือวันที่..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ ...inputStyle, paddingLeft: 38 }}
              />
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Badge label={`Working Days: ${workingDaysLabel || 'Not set'}`} tone="green" />
              <Badge label={`${monthsWithHoliday} months with holidays`} tone="blue" />
            </div>
          </div>
          </SurfaceCard>
        </div>

        {viewMode === 'month' ? (
          <div className="holiday-top-grid holiday-animate">
            <SurfaceCard style={{ padding: 18, position: 'relative', overflow: 'hidden' }}>
              <div
                style={{
                  position: 'absolute',
                  inset: '0 0 auto auto',
                  width: 220,
                  height: 220,
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(14,165,233,0.12) 0%, rgba(14,165,233,0) 70%)',
                  transform: 'translate(30%, -35%)',
                  pointerEvents: 'none',
                }}
              />

              <SectionTitle
                title={selectedMonthLabel}
                subtitle="คลิกวันที่บนปฏิทินเพื่อ prefill ฟอร์มเพิ่มวันหยุด"
                action={
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button data-readonly-allowed="true" onClick={() => stepMonth(-1)} style={secondaryButtonStyle}>◀ Prev</button>
                    <button data-readonly-allowed="true" onClick={() => stepMonth(1)} style={secondaryButtonStyle}>Next ▶</button>
                  </div>
                }
              />

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 6, marginBottom: 8 }}>
                {WEEKDAY_TH.map((day, index) => (
                  <div
                    key={day}
                    style={{
                      padding: '9px 6px',
                      textAlign: 'center',
                      borderRadius: 12,
                      background: index === 0 || index === 6 ? '#fff7ed' : '#f8fafc',
                      color: index === 0 || index === 6 ? '#b45309' : '#64748b',
                      fontSize: 12,
                      fontWeight: 800,
                    }}
                  >
                    {day}
                  </div>
                ))}
              </div>

              <div className="holiday-mini-grid">
                {monthGrid.map((day, idx) => {
                  if (!day) {
                    return (
                      <div
                        key={`empty-${idx}`}
                        className="holiday-calendar-cell"
                        style={{
                          minHeight: 118,
                          borderRadius: 18,
                          border: '1px dashed #e2e8f0',
                          background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
                        }}
                      />
                    )
                  }

                  const isoDate = toIsoDate(selectedYear, selectedMonth, day)
                  const holidayEntries = holidayMap.get(isoDate) || []
                  const weekDay = new Date(selectedYear, selectedMonth, day).getDay()
                  const isWorkingDay = workingDaySet.has(weekDay)
                  const isToday = isoDate === toIsoDate(today.getFullYear(), today.getMonth(), today.getDate())
                  const isSelected = newHolidayDate === isoDate
                  const holidayTone = holidayEntries.length ? '#f97316' : isWorkingDay ? '#16a34a' : '#94a3b8'

                  return (
                    <button
                      key={isoDate}
                      type="button"
                      onClick={() => setNewHolidayDate(isoDate)}
                      className="holiday-calendar-cell"
                      style={{
                        minHeight: 118,
                        borderRadius: 18,
                        border: isSelected ? '2px solid #0ea5e9' : isToday ? '2px solid #2563eb' : '1px solid #e2e8f0',
                        background: holidayEntries.length
                          ? 'linear-gradient(180deg, #fff7ed 0%, #ffffff 85%)'
                          : isWorkingDay
                            ? 'linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)'
                            : 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
                        textAlign: 'left',
                        padding: 10,
                        cursor: 'pointer',
                        position: 'relative',
                      }}
                      title={`Select ${isoDate}`}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6, marginBottom: 8 }}>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 800, color: '#0f172a' }}>{day}</div>
                          <div style={{ marginTop: 2, fontSize: 10, color: '#94a3b8' }}>{MONTHS_SHORT[selectedMonth]}</div>
                        </div>
                        <span
                          style={{
                            padding: '4px 7px',
                            borderRadius: 999,
                            background: holidayEntries.length ? '#fed7aa' : isWorkingDay ? '#dcfce7' : '#e2e8f0',
                            color: holidayTone,
                            fontSize: 10,
                            fontWeight: 800,
                          }}
                        >
                          {holidayEntries.length ? 'Holiday' : isWorkingDay ? 'Work' : 'Off'}
                        </span>
                      </div>

                      <div style={{ display: 'grid', gap: 5 }}>
                        {holidayEntries.slice(0, 2).map((entry) => (
                          <span
                            key={entry.id}
                            style={{
                              fontSize: 10,
                              lineHeight: 1.3,
                              background: '#ffffff',
                              color: '#9a3412',
                              border: '1px solid #fed7aa',
                              borderRadius: 999,
                              padding: '4px 7px',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {entry.description}
                          </span>
                        ))}
                        {holidayEntries.length > 2 ? (
                          <span style={{ fontSize: 10, color: '#c2410c', fontWeight: 800 }}>+{holidayEntries.length - 2} more</span>
                        ) : null}
                        {!holidayEntries.length ? (
                          <span style={{ fontSize: 10, color: '#94a3b8', lineHeight: 1.4 }}>
                            {isWorkingDay ? 'Normal business day' : 'Weekend / non-working day'}
                          </span>
                        ) : null}
                      </div>
                    </button>
                  )
                })}
              </div>
            </SurfaceCard>

            <div style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
              <SurfaceCard style={{ padding: 18 }}>
                <SectionTitle title="Quick Add" subtitle="เพิ่มวันหยุดใหม่จากวันที่เลือกหรือกำหนดเอง" />
                <div style={{ display: 'grid', gap: 12 }}>
                  <div
                    style={{
                      padding: 14,
                      borderRadius: 18,
                      background: 'linear-gradient(135deg, #eff6ff 0%, #f8fafc 100%)',
                      border: '1px solid #dbeafe',
                    }}
                  >
                    <div style={{ fontSize: 12, color: '#1d4ed8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Selected Date</div>
                    <div style={{ marginTop: 6, fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
                      {newHolidayDate ? formatDateDisplay(newHolidayDate) : 'ยังไม่ได้เลือกวันที่'}
                    </div>
                    <div style={{ marginTop: 6, fontSize: 12, color: '#64748b' }}>
                      {selectedDateItems.length ? `${selectedDateItems.length} holiday record on this date` : 'คลิกวันที่ใน calendar เพื่อเติมฟอร์มทันที'}
                    </div>
                  </div>

                  <input type="date" value={newHolidayDate} onChange={(e) => setNewHolidayDate(e.target.value)} style={inputStyle} />
                  <input placeholder="ชื่อวันหยุด..." value={newHolidayDesc} onChange={(e) => setNewHolidayDesc(e.target.value)} style={inputStyle} />
                  <button onClick={handleAddHoliday} disabled={saving} style={{ ...primaryButtonStyle, width: '100%', opacity: saving ? 0.7 : 1 }}>
                    {saving ? 'Saving...' : '+ Add Holiday'}
                  </button>
                </div>
              </SurfaceCard>

              <SurfaceCard style={{ padding: 18 }}>
                <SectionTitle title="Overview" subtitle="legend และข้อมูลที่ช่วย scan calendar เร็วขึ้น" />
                <div style={{ display: 'grid', gap: 10 }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    <Badge label="Holiday date" tone="amber" />
                    <Badge label="Working day" tone="green" />
                    <Badge label="Weekend / Off day" tone="slate" />
                  </div>
                  <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.7 }}>
                    เดือนนี้มีวันหยุด {selectedMonthHolidayCount} รายการ และปีนี้มีเดือนที่มีวันหยุดทั้งหมด {monthsWithHoliday} เดือน
                  </div>
                  <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.7 }}>
                    วันทำงานที่ระบบใช้อ้างอิงอยู่ตอนนี้คือ {workingDaysLabel || 'Not set'} จาก `system_settings.working_hours`
                  </div>
                </div>
              </SurfaceCard>

              <SurfaceCard style={{ padding: 18 }}>
                <SectionTitle title={`Holidays In ${MONTHS_FULL[selectedMonth]}`} subtitle="รายการวันหยุดในเดือนปัจจุบันสำหรับดูข้อมูลย้อนหลัง" />
                <div className="holiday-month-list">
                  {loading ? (
                    <div style={{ color: '#94a3b8', textAlign: 'center', padding: 12 }}>กำลังโหลด...</div>
                  ) : monthlyItems.length === 0 ? (
                    <div style={{ color: '#94a3b8', textAlign: 'center', padding: 12 }}>ไม่พบข้อมูลวันหยุด</div>
                  ) : (
                    monthlyItems.map((item) => (
                      <div
                        key={item.id}
                        style={{
                          border: '1px solid #e2e8f0',
                          borderRadius: 18,
                          padding: 12,
                          background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 800, color: '#1e293b' }}>{formatDateDisplay(item.holiday_date)}</div>
                            <div style={{ marginTop: 6, fontSize: 13, color: '#475569', lineHeight: 1.5 }}>{editingId === item.id && !isReadOnlyAuditor ? '' : item.description}</div>
                          </div>
                          {editingId !== item.id || isReadOnlyAuditor ? <Badge label="Holiday" tone="amber" /> : null}
                        </div>

                        {editingId === item.id && !isReadOnlyAuditor ? (
                          <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
                            <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} style={inputStyle} />
                            <input value={editValue} onChange={(e) => setEditValue(e.target.value)} style={inputStyle} />
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                              <ActionButton color="green" icon="✅" onClick={() => handleUpdateHoliday(item.id)} title="บันทึก" />
                              <ActionButton color="gray" icon="❌" onClick={() => setEditingId(null)} title="ยกเลิก" />
                            </div>
                          </div>
                        ) : !isReadOnlyAuditor ? (
                          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 10 }}>
                            <ActionButton
                              color="blue"
                              icon="✏️"
                              onClick={() => {
                                setEditingId(item.id)
                                setEditDate(item.holiday_date)
                                setEditValue(item.description)
                              }}
                              title="แก้ไข"
                            />
                            <ActionButton color="red" icon="🗑" onClick={() => handleDelete(item.id, item.description)} title="ลบ" />
                          </div>
                        ) : null}
                      </div>
                    ))
                  )}
                </div>
              </SurfaceCard>
            </div>
          </div>
        ) : (
          <div className="holiday-year-grid holiday-animate">
            {yearSummary.map(({ monthIndex, monthItems }) => {
              const accent = getMonthAccent(monthIndex)

              return (
                <button
                  data-readonly-allowed="true"
                  type="button"
                  key={monthIndex}
                  onClick={() => openMonth(monthIndex)}
                  style={{
                    textAlign: 'left',
                    border: '1px solid #e2e8f0',
                    borderRadius: 24,
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.96) 100%)',
                    padding: 18,
                    cursor: 'pointer',
                    boxShadow: CARD_SHADOW,
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      inset: '0 auto auto 0',
                      width: '100%',
                      height: 5,
                      background: accent.solid,
                    }}
                  />

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>{MONTHS_FULL[monthIndex]}</div>
                      <div style={{ marginTop: 4, fontSize: 12, color: '#64748b' }}>Tap to open month view</div>
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 800,
                        color: accent.solid,
                        background: accent.soft,
                        borderRadius: 999,
                        padding: '6px 10px',
                      }}
                    >
                      {monthItems.length} holidays
                    </div>
                  </div>

                  <div style={{ display: 'grid', gap: 8 }}>
                    {monthItems.slice(0, 3).map((item) => (
                      <div
                        key={item.id}
                        style={{
                          fontSize: 12,
                          color: '#334155',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          padding: '8px 10px',
                          borderRadius: 12,
                          border: '1px solid #f1f5f9',
                          background: '#ffffff',
                        }}
                      >
                        {formatDateDisplay(item.holiday_date)} - {item.description}
                      </div>
                    ))}
                    {!monthItems.length ? <div style={{ fontSize: 12, color: '#94a3b8' }}>No holiday</div> : null}
                    {monthItems.length > 3 ? <div style={{ fontSize: 12, color: accent.solid, fontWeight: 800 }}>+{monthItems.length - 3} more</div> : null}
                  </div>
                </button>
              )
            })}
          </div>
        )}

        <div className="holiday-mobile-stack holiday-animate" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: 18, marginTop: 18 }}>
          <SurfaceCard style={{ padding: 18 }}>
            <SectionTitle title="Annual Insights" subtitle="สรุปเพื่อช่วยวางแผนวันหยุดและการตั้งค่า SLA" />
            <div style={{ display: 'grid', gap: 12 }}>
              <div
                style={{
                  padding: 14,
                  borderRadius: 18,
                  background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',
                  border: '1px solid #e2e8f0',
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 800, color: '#0f172a' }}>Next Upcoming Holiday</div>
                <div style={{ marginTop: 8, fontSize: 18, fontWeight: 800, color: '#1d4ed8' }}>
                  {nextHoliday ? formatDateDisplay(nextHoliday.holiday_date) : 'No data'}
                </div>
                <div style={{ marginTop: 6, fontSize: 13, color: '#64748b' }}>{nextHoliday ? nextHoliday.description : 'ยังไม่มีรายการวันหยุดในระบบ'}</div>
              </div>

              <div
                style={{
                  padding: 14,
                  borderRadius: 18,
                  background: 'linear-gradient(135deg, #ecfdf5 0%, #ffffff 100%)',
                  border: '1px solid #d1fae5',
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 800, color: '#065f46' }}>Coverage</div>
                <div style={{ marginTop: 8, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                  {monthsWithHoliday} / 12 months configured
                </div>
                <div style={{ marginTop: 6, fontSize: 13, color: '#64748b' }}>ช่วยมองเห็นช่องว่างของเดือนที่ยังไม่ได้บันทึกวันหยุด</div>
              </div>
            </div>
          </SurfaceCard>

          <SurfaceCard style={{ padding: 18 }}>
            <SectionTitle title="Admin Notes" subtitle="ข้อควรระวังเวลาเพิ่มข้อมูลวันหยุด" />
            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.7 }}>
                1. ใช้รูปแบบวันที่ `YYYY-MM-DD` เมื่อ import CSV เพื่อให้ normalize ได้ตรง
              </div>
              <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.7 }}>
                2. วันหยุดที่บันทึกไว้จะถูกนำไปใช้กับการคำนวณ SLA และ Working Time ของระบบ
              </div>
              <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.7 }}>
                3. หากวันทำงานจริงขององค์กรเปลี่ยน ควรอัปเดตหน้า Working Hours เพื่อให้สถานะ Work/Off บนปฏิทินตรงกัน
              </div>
            </div>
          </SurfaceCard>
        </div>
      </div>

      {showGuide ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 3000,
            padding: 12,
          }}
        >
          <div className="holiday-guide-dialog" style={{ ...baseCardStyle, borderRadius: 28, overflow: 'hidden', boxShadow: FLOATING_SHADOW }}>
            <div
              style={{
                padding: '28px 32px',
                background: 'linear-gradient(135deg, #0f766e 0%, #0ea5e9 100%)',
                color: '#ffffff',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <span style={{ fontSize: 28 }}>📖</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Holidays Guide</h3>
                  <p style={{ margin: '4px 0 0', fontSize: 13, opacity: 0.9 }}>คู่มือการใช้งานและการตั้งค่า</p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                {currentUser?.role === 'admin' ? (
                  <button
                    onClick={() => setEditingGuide(!editingGuide)}
                    style={{
                      padding: '8px 16px',
                      background: 'rgba(255,255,255,0.18)',
                      border: '1px solid rgba(255,255,255,0.3)',
                      borderRadius: 12,
                      color: '#ffffff',
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    {editingGuide ? '👁 View' : '✏️ Edit'}
                  </button>
                ) : null}
                <button
                  data-readonly-allowed="true"
                  onClick={() => {
                    setShowGuide(false)
                    setEditingGuide(false)
                  }}
                  style={{ background: 'none', border: 'none', color: '#ffffff', fontSize: 30, cursor: 'pointer' }}
                >
                  &times;
                </button>
              </div>
            </div>

            <div style={{ padding: 28, overflowY: 'auto', maxHeight: 'calc(90vh - 108px)', background: '#f8fafc' }}>
              {editingGuide ? (
                <div style={{ display: 'grid', gap: 16 }}>
                  <textarea
                    value={guideContent}
                    onChange={(e) => setGuideContent(e.target.value)}
                    style={{
                      width: '100%',
                      minHeight: 420,
                      padding: 20,
                      borderRadius: 18,
                      border: '1px solid #e2e8f0',
                      fontFamily: 'monospace',
                      fontSize: 13,
                      background: '#ffffff',
                    }}
                  />
                  <button onClick={handleSaveGuide} disabled={saving} style={{ ...primaryButtonStyle, justifySelf: 'end', opacity: saving ? 0.7 : 1 }}>
                    บันทึกเนื้อหา
                  </button>
                </div>
              ) : (
                <div style={{ maxWidth: 720, margin: '0 auto' }}>
                  {guideContent.split('---').map((section, sIdx) => (
                    <div
                      key={sIdx}
                      style={{
                        background: section.includes('####') ? '#ffffff' : 'transparent',
                        borderRadius: 20,
                        padding: section.includes('####') ? 24 : 0,
                        marginBottom: section.includes('####') ? 20 : 32,
                        borderLeft: section.includes('####') ? '5px solid #0ea5e9' : 'none',
                        boxShadow: section.includes('####') ? '0 8px 24px -20px rgba(15, 23, 42, 0.35)' : 'none',
                      }}
                    >
                      <div style={{ fontSize: 15, color: '#334155', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                        {section
                          .trim()
                          .split('\n')
                          .map((line, lIdx) => {
                            if (line.startsWith('####')) {
                              return (
                                <h4 key={lIdx} style={{ margin: '0 0 12px', fontSize: 17, fontWeight: 800, color: '#0f172a' }}>
                                  {line.replace(/#/g, '').trim()}
                                </h4>
                              )
                            }
                            if (line.startsWith('###')) {
                              return (
                                <h3 key={lIdx} style={{ margin: '0 0 18px', fontSize: 24, fontWeight: 900, color: '#0f172a' }}>
                                  {line.replace(/#/g, '').trim()}
                                </h3>
                              )
                            }
                            return (
                              <p key={lIdx} style={{ margin: '0 0 8px' }}>
                                {line.includes('**')
                                  ? line.split('**').map((part, index) =>
                                      index % 2 === 1 ? (
                                        <strong key={index} style={{ color: '#0369a1' }}>
                                          {part}
                                        </strong>
                                      ) : (
                                        part
                                      )
                                    )
                                  : line}
                              </p>
                            )
                          })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
