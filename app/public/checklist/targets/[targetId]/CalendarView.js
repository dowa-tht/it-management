'use client'

import { useState } from 'react'

const MONTH_NAMES_TH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']

function normalizeStatus(status) {
  const s = String(status || '').toLowerCase()
  if (s.includes('pending') || s.includes('progress') || s.includes('open') || s.includes('approval')) return 'pending'
  if (s.includes('ng') || s.includes('fail') || s.includes('incident')) return 'ng'
  if (s.includes('close') || s.includes('complete') || s.includes('done') || s.includes('ok')) return 'ok'
  return 'none'
}

function toDateKey(value) {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function statusClass(status) {
  if (status === 'ok') return 'bg-emerald-100 border-emerald-300 text-emerald-700 font-bold'
  if (status === 'ng') return 'bg-rose-100 border-rose-300 text-rose-700 font-bold'
  if (status === 'pending') return 'bg-amber-100 border-amber-300 text-amber-700 font-bold'
  return 'bg-slate-100 border-slate-200 text-slate-500'
}

export function CalendarView({ templates, history }) {
  const [viewMode, setViewMode] = useState('month') // 'year', 'month', 'week'
  const [selectedTemplate, setSelectedTemplate] = useState(templates.length > 0 ? templates[0].id : '')

  const currentTemplate = templates.find(t => t.id === selectedTemplate)
  const filteredHistory = history.filter(h => String(h.template_id) === String(selectedTemplate))

  if (templates.length === 0) {
    return (
      <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
        <p className="text-slate-500">ไม่พบเทมเพลตการตรวจสอบที่ผูกกับอุปกรณ์นี้</p>
      </div>
    )
  }

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const firstWeekday = monthStart.getDay()

  const statusByDate = filteredHistory.reduce((acc, row) => {
    const key = toDateKey(row.period_date || row.checked_at)
    if (!key) return acc
    const next = normalizeStatus(row.status)
    const current = acc[key] || 'none'
    if (next === 'ng' || (next === 'pending' && current !== 'ng') || (next === 'ok' && current === 'none')) {
      acc[key] = next
    }
    return acc
  }, {})

  const currentMonthDays = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1
    const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const dayStatus = statusByDate[key] || 'none'
    return { day, status: dayStatus, statusColor: statusClass(dayStatus) }
  })

  const yearMonthStatus = Array.from({ length: 12 }, (_, monthIndex) => {
    const monthPrefix = `${now.getFullYear()}-${String(monthIndex + 1).padStart(2, '0')}-`
    const monthStatuses = Object.entries(statusByDate)
      .filter(([key]) => key.startsWith(monthPrefix))
      .map(([, s]) => s)
    let finalStatus = 'none'
    if (monthStatuses.includes('ng')) finalStatus = 'ng'
    else if (monthStatuses.includes('pending')) finalStatus = 'pending'
    else if (monthStatuses.includes('ok')) finalStatus = 'ok'
    return { monthLabel: MONTH_NAMES_TH[monthIndex], status: finalStatus }
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <select
          value={selectedTemplate}
          onChange={(e) => setSelectedTemplate(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-slate-50 focus:ring-blue-500 focus:border-blue-500 w-full sm:w-auto"
        >
          {templates.map(t => (
            <option key={t.id} value={t.id}>{t.item_label} ({t.freq_type})</option>
          ))}
        </select>

        <div className="flex bg-slate-100 p-1 rounded-lg w-full sm:w-auto">
          <button
            onClick={() => setViewMode('year')}
            className={`flex-1 sm:px-4 py-1.5 text-xs font-semibold rounded-md transition-colors ${viewMode === 'year' ? 'bg-white shadow text-blue-700' : 'text-slate-600 hover:text-slate-900'}`}
          >
            ปี
          </button>
          <button
            onClick={() => setViewMode('month')}
            className={`flex-1 sm:px-4 py-1.5 text-xs font-semibold rounded-md transition-colors ${viewMode === 'month' ? 'bg-white shadow text-blue-700' : 'text-slate-600 hover:text-slate-900'}`}
          >
            เดือน
          </button>
          <button
            onClick={() => setViewMode('week')}
            className={`flex-1 sm:px-4 py-1.5 text-xs font-semibold rounded-md transition-colors ${viewMode === 'week' ? 'bg-white shadow text-blue-700' : 'text-slate-600 hover:text-slate-900'}`}
          >
            สัปดาห์
          </button>
        </div>
      </div>

      {filteredHistory.length === 0 ? (
        <div className="text-center py-16 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <svg className="w-12 h-12 text-slate-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-slate-500 font-medium">ไม่พบข้อมูลในช่วงความถี่ที่เลือก</p>
        </div>
      ) : (
        <div className="mt-4">
          {viewMode === 'month' && (
            <div>
              <h3 className="text-center font-bold text-slate-700 mb-4">{MONTH_NAMES_TH[now.getMonth()]} {now.getFullYear() + 543}</h3>
              <div className="grid grid-cols-7 gap-2 text-center mb-2">
                {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map(d => (
                  <div key={d} className="text-xs font-semibold text-slate-400">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: firstWeekday }).map((_, idx) => (
                  <div key={`empty-${idx}`} className="aspect-square"></div>
                ))}

                {currentMonthDays.map((d) => (
                  <div
                    key={d.day}
                    className={`aspect-square rounded-lg border flex items-center justify-center text-sm transition-transform hover:scale-105 cursor-pointer ${d.statusColor}`}
                  >
                    {d.day}
                  </div>
                ))}
              </div>
            </div>
          )}
          {viewMode === 'year' && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
              {yearMonthStatus.map((m) => (
                <div key={m.monthLabel} className={`aspect-video rounded-xl border flex flex-col items-center justify-center ${statusClass(m.status)}`}>
                  <span className="text-sm font-semibold">{m.monthLabel}</span>
                  <span className="w-2 h-2 rounded-full mt-2 bg-current"></span>
                </div>
              ))}
            </div>
          )}
          {viewMode === 'week' && (
            <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-200">
              <span className="text-slate-500">สัปดาห์นี้</span>
              <div className="flex gap-2">
                 <span className="w-8 h-8 flex items-center justify-center rounded bg-emerald-100 text-emerald-700 font-bold border border-emerald-200 text-sm">จ</span>
                 <span className="w-8 h-8 flex items-center justify-center rounded bg-slate-100 text-slate-400 border border-slate-200 text-sm">อ</span>
                 <span className="w-8 h-8 flex items-center justify-center rounded bg-slate-100 text-slate-400 border border-slate-200 text-sm">พ</span>
                 <span className="w-8 h-8 flex items-center justify-center rounded bg-slate-100 text-slate-400 border border-slate-200 text-sm">พฤ</span>
                 <span className="w-8 h-8 flex items-center justify-center rounded bg-slate-100 text-slate-400 border border-slate-200 text-sm">ศ</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
