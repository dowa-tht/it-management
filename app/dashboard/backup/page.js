'use client'
import { useState, useEffect } from 'react'
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
  const [form, setForm] = useState({
    log_date: new Date().toISOString().split('T')[0],
    system_name: 'Server & File Share',
    backup_type: 'Server & File Share',
    status: 'Success',
    notes: ''
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchLogs() }, [])

  const fetchLogs = async () => {
    const start = new Date()
    start.setDate(1)
    const { data } = await supabase.from('backup_logs').select('*')
      .gte('log_date', start.toISOString().split('T')[0])
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
    setForm({ log_date: new Date().toISOString().split('T')[0], system_name: 'Server & File Share', backup_type: 'Server & File Share', status: 'Success', notes: '' })
  }

  const stats = {
    total: logs.length,
    success: logs.filter(l => l.status === 'Success').length,
    failed: logs.filter(l => l.status === 'Failed').length,
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ fontSize: 18, fontWeight: 600, color: '#111827', margin: 0 }}>Backup Log</h1>
        <button onClick={() => setShowForm(!showForm)} style={{
          background: '#1d4ed8', color: '#fff', padding: '8px 16px',
          borderRadius: 8, fontSize: 13, border: 'none', cursor: 'pointer'
        }}>
          + บันทึก Backup
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'รายการทั้งหมด (เดือนนี้)', value: stats.total, color: '#111827' },
          { label: 'Success', value: stats.success, color: '#059669' },
          { label: 'Failed', value: stats.failed, color: '#dc2626' },
        ].map(c => (
          <div key={c.label} style={{ background: '#fff', borderRadius: 10, padding: '14px 16px', border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>{c.label}</div>
            <div style={{ fontSize: 28, fontWeight: 600, color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: 20, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>บันทึกผล Backup</div>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 12 }}>
              {[
                { label: 'วันที่', key: 'log_date', type: 'date' },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ fontSize: 12, color: '#374151', display: 'block', marginBottom: 4 }}>{f.label}</label>
                  <input type={f.type} value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }} />
                </div>
              ))}
              <div>
                <label style={{ fontSize: 12, color: '#374151', display: 'block', marginBottom: 4 }}>ระบบ</label>
                <select value={form.backup_type} onChange={e => setForm({ ...form, backup_type: e.target.value, system_name: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, background: '#fff' }}>
                  {SYSTEMS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#374151', display: 'block', marginBottom: 4 }}>สถานะ</label>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, background: '#fff' }}>
                  {Object.keys(STATUS_COLORS).map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#374151', display: 'block', marginBottom: 4 }}>หมายเหตุ</label>
                <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setShowForm(false)} style={{ padding: '7px 16px', border: '1px solid #d1d5db', borderRadius: 7, fontSize: 13, background: '#fff', cursor: 'pointer' }}>ยกเลิก</button>
              <button type="submit" disabled={saving} style={{ padding: '7px 16px', border: 'none', borderRadius: 7, fontSize: 13, background: '#1d4ed8', color: '#fff', cursor: 'pointer' }}>
                {saving ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f9fafb' }}>
              {['วันที่', 'ระบบ', 'ประเภท', 'สถานะ', 'หมายเหตุ'].map(h => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', color: '#6b7280', fontWeight: 500, fontSize: 12, borderBottom: '1px solid #e5e7eb' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ padding: 30, textAlign: 'center', color: '#9ca3af' }}>กำลังโหลด...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: 30, textAlign: 'center', color: '#9ca3af' }}>ยังไม่มีข้อมูล Backup Log</td></tr>
            ) : logs.map(log => (
              <tr key={log.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '12px 16px', color: '#374151' }}>{new Date(log.log_date).toLocaleDateString('th-TH')}</td>
                <td style={{ padding: '12px 16px', color: '#374151' }}>{log.system_name}</td>
                <td style={{ padding: '12px 16px', color: '#6b7280', fontSize: 12 }}>{log.backup_type}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ ...STATUS_COLORS[log.status], padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 500 }}>{log.status}</span>
                </td>
                <td style={{ padding: '12px 16px', color: '#6b7280' }}>{log.notes || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}