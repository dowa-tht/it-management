'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { formatDate } from '@/lib/dateFormat'

const STATUS_COLORS = {
  Success: { bg: '#d1fae5', color: '#065f46' },
  Failed: { bg: '#fee2e2', color: '#991b1b' },
  'No Backup Task': { bg: '#f3f4f6', color: '#6b7280' },
}

const SYSTEMS = ['Server & File Share', 'Microsoft 365']

const ENG_MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
]

function MonthPicker({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false)
  const [viewYear, setViewYear] = useState(() => parseInt(value.split('-')[0]))

  const [year, month] = value.split('-').map(Number)
  const monthLabel = ENG_MONTHS_SHORT[month - 1]

  useEffect(() => {
    setViewYear(parseInt(value.split('-')[0]))
  }, [value])

  const handleMonthSelect = (m) => {
    onChange(`${viewYear}-${String(m).padStart(2, '0')}`)
    setIsOpen(false)
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: '6px 12px', background: '#fff', border: '1px solid #d1d5db',
          borderRadius: 8, fontSize: 13, cursor: 'pointer', display: 'flex',
          alignItems: 'center', gap: 8, minWidth: 120, justifyContent: 'space-between',
          fontFamily: 'inherit'
        }}
      >
        <span style={{ fontWeight: 500 }}>{monthLabel} {viewYear}</span>
        <span style={{ fontSize: 10, color: '#9ca3af', transform: isOpen ? 'rotate(180deg)' : 'rotate(0)', transition: '0.2s' }}>▼</span>
      </button>

      {isOpen && (
        <>
          <div onClick={() => setIsOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 90 }} />
          <div style={{
            position: 'absolute', top: '100%', left: 0, marginTop: 8,
            background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12,
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
            zIndex: 100, padding: 12, width: 180
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <button onClick={() => setViewYear(viewYear - 1)} style={{ background: '#f3f4f6', border: 'none', borderRadius: 6, cursor: 'pointer', padding: '4px 8px', fontSize: 10 }}>◀</button>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>{viewYear}</div>
              <button onClick={() => setViewYear(viewYear + 1)} style={{ background: '#f3f4f6', border: 'none', borderRadius: 6, cursor: 'pointer', padding: '4px 8px', fontSize: 10 }}>▶</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
              {ENG_MONTHS_SHORT.map((m, idx) => (
                <button
                  key={m}
                  onClick={() => handleMonthSelect(idx + 1)}
                  style={{
                    padding: '10px 0', border: 'none', borderRadius: 8, fontSize: 12,
                    background: (idx + 1 === month && viewYear === year) ? '#1d4ed8' : 'transparent',
                    color: (idx + 1 === month && viewYear === year) ? '#fff' : '#374151',
                    cursor: 'pointer', transition: 'all 0.15s', fontWeight: (idx + 1 === month && viewYear === year) ? 600 : 400
                  }}
                  onMouseEnter={e => (idx + 1 !== month || viewYear !== year) && (e.target.style.background = '#f9fafb')}
                  onMouseLeave={e => (idx + 1 !== month || viewYear !== year) && (e.target.style.background = 'transparent')}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default function BackupPage() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [filterMonth, setFilterMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [form, setForm] = useState({
    log_date: new Date().toISOString().split('T')[0],
    system_name: 'Server & File Share',
    backup_type: 'Server & File Share',
    status: 'Success',
    notes: ''
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchLogs() }, [filterMonth])

  const fetchLogs = async () => {
    setLoading(true)
    const [year, month] = filterMonth.split('-')
    const start = `${year}-${month}-01`
    const end = new Date(year, month, 0).toISOString().split('T')[0]
    const { data } = await supabase.from('backup_logs').select('*')
      .gte('log_date', start).lte('log_date', end)
      .order('log_date', { ascending: false })
    setLogs(data || [])
    setLoading(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)

    // Check duplicate
    const { data: existing } = await supabase.from('backup_logs')
      .select('id')
      .eq('log_date', form.log_date)
      .eq('system_name', form.system_name)
      .single()

    if (existing) {
      alert(`มีบันทึกของระบบ ${form.system_name} ในวันที่กำหนดอยู่แล้วครับ (1 ระบบบันทึกได้ 1 ครั้งต่อวัน)`)
      setSaving(false)
      return
    }

    const { error } = await supabase.from('backup_logs').insert([form])
    if (error) {
      alert(`บันทึกข้อมูลไม่สำเร็จ: ${error.message}`)
      setSaving(false)
      return
    }
    await fetchLogs()
    setShowForm(false)
    setSaving(false)
    setForm({ log_date: new Date().toISOString().split('T')[0], system_name: 'Server & File Share', backup_type: 'Server & File Share', status: 'Success', notes: '' })
  }

  const handleDelete = async (id) => {
    if (!confirm('ต้องการลบรายการนี้ใช่ไหม?')) return
    const { error } = await supabase.from('backup_logs').delete().eq('id', id)
    if (error) {
      alert(`ลบข้อมูลไม่สำเร็จ: ${error.message}`)
      return
    }
    await fetchLogs()
  }


  const stats = {
    total: logs.length,
    success: logs.filter(l => l.status === 'Success').length,
    failed: logs.filter(l => l.status === 'Failed').length,
    noTask: logs.filter(l => l.status === 'No Backup Task').length,
  }

  const successRate = stats.total > 0 ? Math.round((stats.success / stats.total) * 100) : 0

  const monthLabel = () => {
    const [y, m] = filterMonth.split('-')
    return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }

  return (
    <>
      {/* SCREEN VIEW */}
      <div className="no-print" style={{ padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: 18, fontWeight: 600, color: '#111827', margin: 0 }}>Backup Log</h1>
            <MonthPicker value={filterMonth} onChange={setFilterMonth} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowForm(!showForm)} style={{ background: '#1d4ed8', color: '#fff', padding: '8px 16px', borderRadius: 8, fontSize: 13, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
              + บันทึก Backup
            </button>
          </div>
        </div>

        <div className="stat-grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'รายการทั้งหมด', value: stats.total, color: '#111827' },
            { label: 'Success', value: stats.success, color: '#059669' },
            { label: 'Failed', value: stats.failed, color: '#dc2626' },
            { label: 'Success Rate', value: `${successRate}%`, color: successRate >= 90 ? '#059669' : '#d97706' },
          ].map(c => (
            <div key={c.label} style={{ background: '#fff', borderRadius: 10, padding: '14px 16px', border: '1px solid #e5e7eb' }}>
              <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>{c.label}</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: c.color }}>{c.value}</div>
            </div>
          ))}
        </div>

        {showForm && (
          <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: 20, marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>บันทึกผล Backup</div>
            <form onSubmit={handleSubmit}>
              <div className="form-grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: '#374151', display: 'block', marginBottom: 4 }}>วันที่</label>
                  <input type="date" value={form.log_date} onChange={e => setForm({ ...form, log_date: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, fontFamily: 'inherit' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#374151', display: 'block', marginBottom: 4 }}>ระบบ</label>
                  <select value={form.backup_type} onChange={e => setForm({ ...form, backup_type: e.target.value, system_name: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, background: '#fff', fontFamily: 'inherit' }}>
                    {SYSTEMS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#374151', display: 'block', marginBottom: 4 }}>สถานะ</label>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, background: '#fff', fontFamily: 'inherit' }}>
                    {Object.keys(STATUS_COLORS).map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#374151', display: 'block', marginBottom: 4 }}>หมายเหตุ</label>
                  <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, fontFamily: 'inherit' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowForm(false)} style={{ padding: '7px 16px', border: '1px solid #d1d5db', borderRadius: 7, fontSize: 13, background: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>ยกเลิก</button>
                <button type="submit" disabled={saving} style={{ padding: '7px 16px', border: 'none', borderRadius: 7, fontSize: 13, background: '#1d4ed8', color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>
                  {saving ? 'กำลังบันทึก...' : 'บันทึก'}
                </button>
              </div>
            </form>
          </div>
        )}

        <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6', fontSize: 13, fontWeight: 500, color: '#374151' }}>
            รายการ Backup — {monthLabel()}
          </div>
          <div className="table-scroll">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  {['วันที่', 'ระบบ', 'ประเภท', 'สถานะ', 'หมายเหตุ', ''].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', color: '#6b7280', fontWeight: 500, fontSize: 12, borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} style={{ padding: 30, textAlign: 'center', color: '#9ca3af' }}>กำลังโหลด...</td></tr>
                ) : logs.length === 0 ? (
                  <tr><td colSpan={6} style={{ padding: 30, textAlign: 'center', color: '#9ca3af' }}>ยังไม่มีข้อมูล Backup Log ในเดือนนี้</td></tr>
                ) : logs.map(log => (
                  <tr key={log.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '11px 16px', color: '#374151', whiteSpace: 'nowrap' }}>{formatDate(log.log_date)}</td>
                    <td style={{ padding: '11px 16px', color: '#374151' }}>{log.system_name}</td>
                    <td style={{ padding: '11px 16px', color: '#6b7280', fontSize: 12 }}>{log.backup_type}</td>
                    <td style={{ padding: '11px 16px', whiteSpace: 'nowrap' }}>
                      <span style={{ ...STATUS_COLORS[log.status], padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 500 }}>{log.status}</span>
                    </td>
                    <td style={{ padding: '11px 16px', color: '#6b7280' }}>{log.notes || '—'}</td>
                    <td style={{ padding: '11px 16px' }}>
                      <button onClick={() => handleDelete(log.id)} style={{ background: 'none', border: 'none', color: '#d1d5db', cursor: 'pointer', fontSize: 16, fontFamily: 'inherit' }}>×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </>
  )
}
