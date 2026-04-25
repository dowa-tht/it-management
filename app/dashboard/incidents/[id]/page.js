'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

const SEVERITY_COLORS = {
  High: { bg: '#fee2e2', color: '#991b1b' },
  Medium: { bg: '#fef3c7', color: '#92400e' },
  Low: { bg: '#d1fae5', color: '#065f46' },
}
const STATUS_COLORS = {
  Open: { bg: '#dbeafe', color: '#1e40af' },
  'In Progress': { bg: '#fef3c7', color: '#92400e' },
  Resolved: { bg: '#d1fae5', color: '#065f46' },
}

export default function IncidentDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [incident, setIncident] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchIncident() }, [id])

  const fetchIncident = async () => {
    const { data } = await supabase.from('incidents').select('*').eq('id', id).single()
    setIncident(data)
    setForm(data || {})
    setLoading(false)
  }

  const handleSave = async () => {
    setSaving(true)
    const updateData = { ...form }
    if (form.status === 'Resolved' && !incident.resolved_at) {
      updateData.resolved_at = new Date().toISOString()
    }
    await supabase.from('incidents').update(updateData).eq('id', id)
    setIncident(updateData)
    setEditing(false)
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!confirm('ต้องการลบ Incident นี้ใช่ไหม?')) return
    await supabase.from('incidents').delete().eq('id', id)
    router.push('/dashboard/incidents')
  }

  const handlePrint = () => window.print()

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>กำลังโหลด...</div>
  if (!incident) return <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>ไม่พบข้อมูล</div>

  const field = (label, key, type = 'text', options = null) => (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>{label}</div>
      {editing ? (
        options ? (
          <select value={form[key] || ''} onChange={e => setForm({ ...form, [key]: e.target.value })}
            style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, background: '#fff' }}>
            {options.map(o => <option key={o}>{o}</option>)}
          </select>
        ) : type === 'textarea' ? (
          <textarea value={form[key] || ''} onChange={e => setForm({ ...form, [key]: e.target.value })}
            rows={3} style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, resize: 'vertical' }} />
        ) : (
          <input value={form[key] || ''} onChange={e => setForm({ ...form, [key]: e.target.value })}
            style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }} />
        )
      ) : (
        <div style={{ fontSize: 14, color: incident[key] ? '#111827' : '#d1d5db', padding: '6px 0', borderBottom: '1px solid #f3f4f6' }}>
          {incident[key] || '—'}
        </div>
      )}
    </div>
  )

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-area { padding: 0 !important; max-width: 100% !important; }
          body { background: white !important; }
        }
      `}</style>

      <div className="print-area" style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
        {/* Header */}
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link href="/dashboard/incidents" style={{ color: '#6b7280', fontSize: 13, textDecoration: 'none' }}>← กลับ</Link>
            <h1 style={{ fontSize: 18, fontWeight: 600, color: '#111827', margin: 0 }}>รายละเอียด Incident</h1>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handlePrint} style={{ padding: '7px 14px', border: '1px solid #d1d5db', borderRadius: 7, fontSize: 13, background: '#fff', cursor: 'pointer', color: '#374151' }}>
              🖨 Print
            </button>
            {!editing ? (
              <>
                <button onClick={() => setEditing(true)} style={{ padding: '7px 14px', border: '1px solid #d1d5db', borderRadius: 7, fontSize: 13, background: '#fff', cursor: 'pointer', color: '#374151' }}>
                  ✏️ แก้ไข
                </button>
                <button onClick={handleDelete} style={{ padding: '7px 14px', border: 'none', borderRadius: 7, fontSize: 13, background: '#fee2e2', cursor: 'pointer', color: '#991b1b' }}>
                  🗑 ลบ
                </button>
              </>
            ) : (
              <>
                <button onClick={() => { setEditing(false); setForm(incident) }} style={{ padding: '7px 14px', border: '1px solid #d1d5db', borderRadius: 7, fontSize: 13, background: '#fff', cursor: 'pointer' }}>
                  ยกเลิก
                </button>
                <button onClick={handleSave} disabled={saving} style={{ padding: '7px 16px', border: 'none', borderRadius: 7, fontSize: 13, background: '#1d4ed8', color: '#fff', cursor: 'pointer' }}>
                  {saving ? 'กำลังบันทึก...' : 'บันทึก'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Print Header */}
        <div style={{ display: 'none' }} className="print-header">
          <div style={{ textAlign: 'center', marginBottom: 20, borderBottom: '2px solid #000', paddingBottom: 12 }}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>DOWA - IT Incident Report</div>
            <div style={{ fontSize: 13, color: '#666' }}>FR-IT-01 | {incident.case_number}</div>
          </div>
        </div>

        {/* Case Header Card */}
        <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: 20, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 12, color: '#9ca3af', fontFamily: 'monospace', marginBottom: 4 }}>{incident.case_number}</div>
              <div style={{ fontSize: 18, fontWeight: 600, color: '#111827' }}>{incident.title}</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <span style={{ ...SEVERITY_COLORS[incident.severity], padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500 }}>
                {incident.severity}
              </span>
              <span style={{ ...STATUS_COLORS[incident.status], padding: '4px 12px', borderRadius: 20, fontSize: 12 }}>
                {incident.status}
              </span>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, fontSize: 12, color: '#6b7280', paddingTop: 12, borderTop: '1px solid #f3f4f6' }}>
            <div>วันที่แจ้ง: <span style={{ color: '#374151' }}>{new Date(incident.created_at).toLocaleDateString('th-TH', { dateStyle: 'long' })}</span></div>
            <div>ผู้แจ้ง: <span style={{ color: '#374151' }}>{incident.reported_by || '—'}</span></div>
            <div>ผู้รับผิดชอบ: <span style={{ color: '#374151' }}>{incident.assigned_to || '—'}</span></div>
          </div>
        </div>

        {/* Details */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid #f3f4f6' }}>ข้อมูลหลัก</div>
            {field('หัวข้อ', 'title')}
            {field('ระบบที่ได้รับผลกระทบ', 'affected_system')}
            {field('ประเภท Incident', 'category')}
            {field('ระดับความรุนแรง', 'severity', 'select', ['High', 'Medium', 'Low'])}
            {field('สถานะ', 'status', 'select', ['Open', 'In Progress', 'Resolved'])}
          </div>
          <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid #f3f4f6' }}>รายละเอียด</div>
            {field('อาการที่พบ / รายละเอียด', 'description', 'textarea')}
            {field('Root Cause Analysis', 'root_cause', 'textarea')}
            {field('วิธีการแก้ไข', 'resolution', 'textarea')}
          </div>
        </div>
      </div>
    </>
  )
}