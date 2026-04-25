'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

const STATUS_COLORS = {
  Success: { bg: '#d1fae5', color: '#065f46' },
  Failed: { bg: '#fee2e2', color: '#991b1b' },
  'No Backup Task': { bg: '#f3f4f6', color: '#6b7280' },
}

const SYSTEMS = ['Server & File Share', 'Microsoft 365', 'Recovery Test']

export default function BackupPage() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [printMode, setPrintMode] = useState(false)
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
      .gte('log_date', start)
      .lte('log_date', end)
      .order('log_date', { ascending: false })
    setLogs(data || [])
    setLoading(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    await supabase.from('backup_logs').insert([form])
    await fetchLogs()
    setShowForm(false)
    setSaving(false)
    setForm({
      log_date: new Date().toISOString().split('T')[0],
      system_name: 'Server & File Share',
      backup_type: 'Server & File Share',
      status: 'Success',
      notes: ''
    })
  }

  const handleDelete = async (id) => {
    if (!confirm('ต้องการลบรายการนี้ใช่ไหม?')) return
    await supabase.from('backup_logs').delete().eq('id', id)
    await fetchLogs()
  }

  const handlePrint = () => window.print()

  const stats = {
    total: logs.length,
    success: logs.filter(l => l.status === 'Success').length,
    failed: logs.filter(l => l.status === 'Failed').length,
    noTask: logs.filter(l => l.status === 'No Backup Task').length,
  }

  const successRate = stats.total > 0 ? Math.round((stats.success / stats.total) * 100) : 0

  const monthLabel = () => {
    const [y, m] = filterMonth.split('-')
    return new Date(y, m - 1, 1).toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })
  }

  const formatDate = (d) => new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { background: white !important; margin: 0; }
          @page { margin: 15mm; }
        }
        @media screen {
          .print-only { display: none !important; }
        }
      `}</style>

      {/* ===== SCREEN VIEW ===== */}
      <div className="no-print" style={{ padding: 24 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: 18, fontWeight: 600, color: '#111827', margin: 0 }}>Backup Log</h1>
            <input
              type="month"
              value={filterMonth}
              onChange={e => setFilterMonth(e.target.value)}
              style={{ padding: '5px 10px', border: '1px solid #d1d5db', borderRadius: 7, fontSize: 13, fontFamily: 'inherit' }}
            />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handlePrint} style={{
              padding: '7px 14px', border: '1px solid #d1d5db', borderRadius: 7,
              fontSize: 13, background: '#fff', cursor: 'pointer', color: '#374151', fontFamily: 'inherit'
            }}>
              🖨 Print FR-IT-02
            </button>
            <button onClick={() => setShowForm(!showForm)} style={{
              background: '#1d4ed8', color: '#fff', padding: '8px 16px',
              borderRadius: 8, fontSize: 13, border: 'none', cursor: 'pointer', fontFamily: 'inherit'
            }}>
              + บันทึก Backup
            </button>
          </div>
        </div>

        {/* Stats */}
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

        {/* Form */}
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

        {/* Table */}
        <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6', fontSize: 13, fontWeight: 500, color: '#374151' }}>
            รายการ Backup — {monthLabel()}
          </div>
          <div className="table-scroll">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  {['วันที่', 'ระบบ', 'ประเภท', 'สถานะ', 'หมายเหตุ', ''].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', color: '#6b7280', fontWeight: 500, fontSize: 12, borderBottom: '1px solid #e5e7eb' }}>{h}</th>
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
                    <td style={{ padding: '11px 16px', color: '#374151' }}>{formatDate(log.log_date)}</td>
                    <td style={{ padding: '11px 16px', color: '#374151' }}>{log.system_name}</td>
                    <td style={{ padding: '11px 16px', color: '#6b7280', fontSize: 12 }}>{log.backup_type}</td>
                    <td style={{ padding: '11px 16px' }}>
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

      {/* ===== PRINT VIEW FR-IT-02 ===== */}
      <div className="print-only" style={{ padding: '0', fontFamily: 'Noto Sans Thai, sans-serif' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, borderBottom: '2px solid #000', paddingBottom: 12 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>DOWA</div>
            <div style={{ fontSize: 10, color: '#666' }}>บริษัท ดาว่า ไทยแลนด์ จำกัด</div>
          </div>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>บันทึกผลการสำรองข้อมูลและทดสอบการกู้คืน</div>
            <div style={{ fontSize: 12, color: '#444' }}>Backup Log & Recovery Test Form</div>
          </div>
          <div style={{ textAlign: 'right', fontSize: 11 }}>
            <div>เอกสารเลขที่: <strong>FR-IT-02</strong></div>
            <div>Rev: 00</div>
            <div>วันที่บังคับใช้: 30-Apr-26</div>
          </div>
        </div>

        {/* Summary */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
          <tbody>
            <tr>
              <td style={{ border: '1px solid #000', padding: '5px 8px', background: '#f5f5f5', fontWeight: 600, fontSize: 11, width: 140 }}>ประจำเดือน</td>
              <td style={{ border: '1px solid #000', padding: '5px 8px', fontSize: 12 }}>{monthLabel()}</td>
              <td style={{ border: '1px solid #000', padding: '5px 8px', background: '#f5f5f5', fontWeight: 600, fontSize: 11, width: 140 }}>จำนวนรายการ</td>
              <td style={{ border: '1px solid #000', padding: '5px 8px', fontSize: 12 }}>{stats.total} รายการ</td>
            </tr>
            <tr>
              <td style={{ border: '1px solid #000', padding: '5px 8px', background: '#f5f5f5', fontWeight: 600, fontSize: 11 }}>Success</td>
              <td style={{ border: '1px solid #000', padding: '5px 8px', fontSize: 12 }}>{stats.success} รายการ</td>
              <td style={{ border: '1px solid #000', padding: '5px 8px', background: '#f5f5f5', fontWeight: 600, fontSize: 11 }}>Failed</td>
              <td style={{ border: '1px solid #000', padding: '5px 8px', fontSize: 12 }}>{stats.failed} รายการ</td>
            </tr>
            <tr>
              <td style={{ border: '1px solid #000', padding: '5px 8px', background: '#f5f5f5', fontWeight: 600, fontSize: 11 }}>Success Rate</td>
              <td style={{ border: '1px solid #000', padding: '5px 8px', fontSize: 12, fontWeight: 700 }}>{successRate}%</td>
              <td style={{ border: '1px solid #000', padding: '5px 8px', background: '#f5f5f5', fontWeight: 600, fontSize: 11 }}>No Backup Task</td>
              <td style={{ border: '1px solid #000', padding: '5px 8px', fontSize: 12 }}>{stats.noTask} รายการ</td>
            </tr>
          </tbody>
        </table>

        {/* Log Table */}
        <div style={{ fontSize: 12, fontWeight: 700, background: '#f0f0f0', padding: '5px 8px', border: '1px solid #000', borderBottom: 'none' }}>
          รายการบันทึกผลการสำรองข้อมูล
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
          <thead>
            <tr style={{ background: '#f5f5f5' }}>
              {['ลำดับ', 'วันที่', 'ระบบ / ข้อมูล', 'ประเภท', 'สถานะ', 'หมายเหตุ'].map(h => (
                <th key={h} style={{ border: '1px solid #000', padding: '5px 8px', fontSize: 11, fontWeight: 600, textAlign: 'left' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ border: '1px solid #000', padding: '10px 8px', textAlign: 'center', fontSize: 12, color: '#999' }}>
                  ไม่มีข้อมูลในเดือนนี้
                </td>
              </tr>
            ) : logs.map((log, i) => (
              <tr key={log.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                <td style={{ border: '1px solid #000', padding: '4px 8px', fontSize: 11, textAlign: 'center', width: 40 }}>{i + 1}</td>
                <td style={{ border: '1px solid #000', padding: '4px 8px', fontSize: 11, whiteSpace: 'nowrap' }}>
                  {new Date(log.log_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}
                </td>
                <td style={{ border: '1px solid #000', padding: '4px 8px', fontSize: 11 }}>{log.system_name}</td>
                <td style={{ border: '1px solid #000', padding: '4px 8px', fontSize: 11 }}>{log.backup_type}</td>
                <td style={{ border: '1px solid #000', padding: '4px 8px', fontSize: 11, fontWeight: log.status === 'Failed' ? 700 : 400, color: log.status === 'Failed' ? '#dc2626' : log.status === 'Success' ? '#059669' : '#666' }}>
                  {log.status}
                </td>
                <td style={{ border: '1px solid #000', padding: '4px 8px', fontSize: 11 }}>{log.notes || ''}</td>
              </tr>
            ))}
            {/* Empty rows */}
            {Array.from({ length: Math.max(0, 5 - logs.length) }).map((_, i) => (
              <tr key={`empty-${i}`}>
                <td style={{ border: '1px solid #000', padding: '12px 8px', fontSize: 11 }}>&nbsp;</td>
                <td style={{ border: '1px solid #000', padding: '12px 8px' }}></td>
                <td style={{ border: '1px solid #000', padding: '12px 8px' }}></td>
                <td style={{ border: '1px solid #000', padding: '12px 8px' }}></td>
                <td style={{ border: '1px solid #000', padding: '12px 8px' }}></td>
                <td style={{ border: '1px solid #000', padding: '12px 8px' }}></td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Signature */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 12 }}>
          <tbody>
            <tr>
              <td style={{ border: '1px solid #000', padding: '8px', width: '50%', verticalAlign: 'top' }}>
                <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>ผู้บันทึก / IT Officer</div>
                <div style={{ minHeight: 50 }}></div>
                <div style={{ fontSize: 11, borderTop: '1px dotted #999', paddingTop: 4, marginTop: 8 }}>
                  ชื่อ: .................................................. วันที่: ....................
                </div>
              </td>
              <td style={{ border: '1px solid #000', padding: '8px', width: '50%', verticalAlign: 'top' }}>
                <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>ผู้จัดการทบทวน / Senior Manager</div>
                <div style={{ minHeight: 50 }}></div>
                <div style={{ fontSize: 11, borderTop: '1px dotted #999', paddingTop: 4, marginTop: 8 }}>
                  ชื่อ: .................................................. วันที่: ....................
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Footer */}
        <div style={{ textAlign: 'right', fontSize: 10, color: '#999' }}>
          พิมพ์เมื่อ: {new Date().toLocaleString('th-TH')} | DOWA IT System | FR-IT-02 Rev.00
        </div>
      </div>
    </>
  )
}