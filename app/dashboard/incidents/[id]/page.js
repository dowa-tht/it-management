'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { formatDate, formatDateTime } from '@/lib/dateFormat'

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

  const SLAResponse = incident.severity === 'High' ? 'ทันที (ภายใน 1 ชั่วโมง)' : incident.severity === 'Medium' ? 'ภายใน 2 ชั่วโมง' : 'ภายใน 6 ชั่วโมง'
  const SLAResolve = incident.severity === 'High' ? 'ภายใน 4 ชั่วโมง' : incident.severity === 'Medium' ? 'ภายใน 8 ชั่วโมง' : 'ภายใน 3 วันทำการ'

  const field = (label, key, type = 'text', options = null) => (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>{label}</div>
      {editing ? (
        options ? (
          <select value={form[key] || ''} onChange={e => setForm({ ...form, [key]: e.target.value })}
            style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, background: '#fff', fontFamily: 'inherit' }}>
            {options.map(o => <option key={o}>{o}</option>)}
          </select>
        ) : type === 'textarea' ? (
          <textarea value={form[key] || ''} onChange={e => setForm({ ...form, [key]: e.target.value })}
            rows={3} style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, resize: 'vertical', fontFamily: 'inherit' }} />
        ) : (
          <input value={form[key] || ''} onChange={e => setForm({ ...form, [key]: e.target.value })}
            style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, fontFamily: 'inherit' }} />
        )
      ) : (
        <div style={{ fontSize: 14, color: incident[key] ? '#111827' : '#d1d5db', padding: '6px 0', borderBottom: '1px solid #f3f4f6', minHeight: 32, whiteSpace: 'pre-wrap' }}>
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
          .print-only { display: block !important; }
          body { background: white !important; margin: 0; }
          .print-page { padding: 20mm 15mm !important; max-width: 100% !important; }
        }
        @media screen { .print-only { display: none !important; } }
      `}</style>

      {/* SCREEN VIEW */}
      <div className="no-print print-page" style={{ padding: 24, maxWidth: 860, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link href="/dashboard/incidents" style={{ color: '#6b7280', fontSize: 13, textDecoration: 'none' }}>← กลับ</Link>
            <h1 style={{ fontSize: 18, fontWeight: 600, color: '#111827', margin: 0 }}>รายละเอียด Incident</h1>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={handlePrint} style={{ padding: '7px 14px', border: '1px solid #d1d5db', borderRadius: 7, fontSize: 13, background: '#fff', cursor: 'pointer', color: '#374151', fontFamily: 'inherit' }}>
              🖨 Print FR-IT-01
            </button>
            {!editing ? (
              <>
                <button onClick={() => setEditing(true)} style={{ padding: '7px 14px', border: '1px solid #d1d5db', borderRadius: 7, fontSize: 13, background: '#fff', cursor: 'pointer', color: '#374151', fontFamily: 'inherit' }}>✏️ แก้ไข</button>
                <button onClick={handleDelete} style={{ padding: '7px 14px', border: 'none', borderRadius: 7, fontSize: 13, background: '#fee2e2', cursor: 'pointer', color: '#991b1b', fontFamily: 'inherit' }}>🗑 ลบ</button>
              </>
            ) : (
              <>
                <button onClick={() => { setEditing(false); setForm(incident) }} style={{ padding: '7px 14px', border: '1px solid #d1d5db', borderRadius: 7, fontSize: 13, background: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>ยกเลิก</button>
                <button onClick={handleSave} disabled={saving} style={{ padding: '7px 16px', border: 'none', borderRadius: 7, fontSize: 13, background: '#1d4ed8', color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>
                  {saving ? 'กำลังบันทึก...' : 'บันทึก'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Case Header */}
        <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: 20, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div style={{ fontSize: 12, color: '#9ca3af', fontFamily: 'monospace', marginBottom: 4 }}>{incident.case_number}</div>
              <div style={{ fontSize: 18, fontWeight: 600, color: '#111827' }}>{incident.title}</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <span style={{ ...SEVERITY_COLORS[incident.severity], padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500 }}>{incident.severity}</span>
              <span style={{ ...STATUS_COLORS[incident.status], padding: '4px 12px', borderRadius: 20, fontSize: 12 }}>{incident.status}</span>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, fontSize: 12, color: '#6b7280', paddingTop: 12, borderTop: '1px solid #f3f4f6' }}>
            <div>วันที่แจ้ง: <span style={{ color: '#374151' }}>{formatDate(incident.created_at)}</span></div>
            <div>ผู้แจ้ง: <span style={{ color: '#374151' }}>{incident.reported_by || '—'}</span></div>
            <div>ผู้รับผิดชอบ: <span style={{ color: '#374151' }}>{incident.assigned_to || '—'}</span></div>
            {incident.resolved_at && <div>วันที่แก้ไขเสร็จ: <span style={{ color: '#059669' }}>{formatDate(incident.resolved_at)}</span></div>}
          </div>
        </div>

        {/* Detail Grid */}
        <div className="detail-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid #f3f4f6' }}>ข้อมูลหลัก</div>
            {field('ระบบที่ได้รับผลกระทบ', 'affected_system')}
            {field('ประเภท Incident', 'category')}
            {field('ระดับความรุนแรง', 'severity', 'select', ['High', 'Medium', 'Low'])}
            {field('สถานะ', 'status', 'select', ['Open', 'In Progress', 'Resolved'])}
            {field('ผู้แจ้ง', 'reported_by')}
            {field('ผู้รับผิดชอบ', 'assigned_to')}
          </div>
          <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid #f3f4f6' }}>รายละเอียด</div>
            {field('อาการที่พบ / รายละเอียด', 'description', 'textarea')}
            {field('Root Cause Analysis', 'root_cause', 'textarea')}
            {field('วิธีการแก้ไข / Resolution', 'resolution', 'textarea')}
          </div>
        </div>

        {/* SLA */}
        <div style={{ background: '#eff6ff', borderRadius: 10, border: '1px solid #bfdbfe', padding: 16, fontSize: 13 }}>
          <div style={{ fontWeight: 600, color: '#1e40af', marginBottom: 8 }}>SLA ตามระดับความรุนแรง ({incident.severity})</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, color: '#374151' }}>
            <div>⏱ Response Time: <strong>{SLAResponse}</strong></div>
            <div>✅ Resolution Time: <strong>{SLAResolve}</strong></div>
          </div>
        </div>
      </div>

      {/* PRINT VIEW FR-IT-01 */}
      <div className="print-only" style={{ padding: '20mm 15mm', fontFamily: 'Noto Sans Thai, sans-serif' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, borderBottom: '2px solid #000', paddingBottom: 12 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>DOWA</div>
            <div style={{ fontSize: 10, color: '#666' }}>บริษัท ดาว่า ไทยแลนด์ จำกัด</div>
          </div>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>บันทึก IT Incident</div>
            <div style={{ fontSize: 12, color: '#444' }}>IT Incident Log Form</div>
          </div>
          <div style={{ textAlign: 'right', fontSize: 11 }}>
            <div>เอกสารเลขที่: <strong>FR-IT-01</strong></div>
            <div>Rev: 00</div>
            <div>วันที่บังคับใช้: 30-Apr-2026</div>
          </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 12 }}>
          <tbody>
            <tr>
              <td style={{ border: '1px solid #000', padding: '5px 8px', background: '#f5f5f5', fontWeight: 600, fontSize: 11, width: 140 }}>Case Number</td>
              <td style={{ border: '1px solid #000', padding: '5px 8px', fontSize: 12, width: '30%' }}>{incident.case_number}</td>
              <td style={{ border: '1px solid #000', padding: '5px 8px', background: '#f5f5f5', fontWeight: 600, fontSize: 11, width: 140 }}>วันที่แจ้ง</td>
              <td style={{ border: '1px solid #000', padding: '5px 8px', fontSize: 12 }}>{formatDateTime(incident.created_at)}</td>
            </tr>
            <tr>
              <td style={{ border: '1px solid #000', padding: '5px 8px', background: '#f5f5f5', fontWeight: 600, fontSize: 11 }}>ผู้แจ้ง</td>
              <td style={{ border: '1px solid #000', padding: '5px 8px', fontSize: 12 }}>{incident.reported_by || '—'}</td>
              <td style={{ border: '1px solid #000', padding: '5px 8px', background: '#f5f5f5', fontWeight: 600, fontSize: 11 }}>ผู้รับผิดชอบ</td>
              <td style={{ border: '1px solid #000', padding: '5px 8px', fontSize: 12 }}>{incident.assigned_to || '—'}</td>
            </tr>
            <tr>
              <td style={{ border: '1px solid #000', padding: '5px 8px', background: '#f5f5f5', fontWeight: 600, fontSize: 11 }}>ระบบที่เกิดเหตุ</td>
              <td style={{ border: '1px solid #000', padding: '5px 8px', fontSize: 12 }}>{incident.affected_system || '—'}</td>
              <td style={{ border: '1px solid #000', padding: '5px 8px', background: '#f5f5f5', fontWeight: 600, fontSize: 11 }}>ประเภท</td>
              <td style={{ border: '1px solid #000', padding: '5px 8px', fontSize: 12 }}>{incident.category || '—'}</td>
            </tr>
            <tr>
              <td style={{ border: '1px solid #000', padding: '5px 8px', background: '#f5f5f5', fontWeight: 600, fontSize: 11 }}>ระดับความรุนแรง</td>
              <td style={{ border: '1px solid #000', padding: '5px 8px', fontSize: 12 }}>
                <strong>{incident.severity}</strong> — Response: {SLAResponse} / Resolution: {SLAResolve}
              </td>
              <td style={{ border: '1px solid #000', padding: '5px 8px', background: '#f5f5f5', fontWeight: 600, fontSize: 11 }}>สถานะ</td>
              <td style={{ border: '1px solid #000', padding: '5px 8px', fontSize: 12 }}><strong>{incident.status}</strong></td>
            </tr>
          </tbody>
        </table>

        {[
          { label: 'หัวข้อ / อาการที่พบ', value: incident.title, height: 40 },
          { label: 'รายละเอียด / Description', value: incident.description, height: 60 },
          { label: 'สาเหตุที่แท้จริง / Root Cause Analysis', value: incident.root_cause, height: 60 },
          { label: 'วิธีการแก้ไข / Resolution', value: incident.resolution, height: 60 },
        ].map((item, i) => (
          <div key={i} style={{ border: '1px solid #000', borderTop: i === 0 ? '1px solid #000' : 'none', marginBottom: 0 }}>
            <div style={{ background: '#f0f0f0', padding: '5px 8px', fontWeight: 700, fontSize: 12, borderBottom: '1px solid #000' }}>{item.label}</div>
            <div style={{ padding: '8px 10px', fontSize: 12, minHeight: item.height, whiteSpace: 'pre-wrap' }}>{item.value || '—'}</div>
          </div>
        ))}

        <table style={{ width: '100%', borderCollapse: 'collapse', margin: '12px 0' }}>
          <tbody>
            <tr>
              <td style={{ border: '1px solid #000', padding: '5px 8px', background: '#f5f5f5', fontWeight: 600, fontSize: 11, width: 140 }}>วันที่/เวลาแจ้ง</td>
              <td style={{ border: '1px solid #000', padding: '5px 8px', fontSize: 12 }}>{formatDateTime(incident.created_at)}</td>
              <td style={{ border: '1px solid #000', padding: '5px 8px', background: '#f5f5f5', fontWeight: 600, fontSize: 11, width: 140 }}>วันที่/เวลาแก้ไขเสร็จ</td>
              <td style={{ border: '1px solid #000', padding: '5px 8px', fontSize: 12 }}>{formatDateTime(incident.resolved_at)}</td>
            </tr>
          </tbody>
        </table>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td style={{ border: '1px solid #000', padding: '8px', width: '50%', verticalAlign: 'top' }}>
                <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>ผู้บันทึก / IT Officer</div>
                <div style={{ minHeight: 50 }}></div>
                <div style={{ fontSize: 11, borderTop: '1px dotted #999', paddingTop: 4, marginTop: 8 }}>ชื่อ: .................................................. วันที่: ....................</div>
              </td>
              <td style={{ border: '1px solid #000', padding: '8px', width: '50%', verticalAlign: 'top' }}>
                <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>ผู้จัดการรับทราบ / Senior Manager (High only)</div>
                <div style={{ minHeight: 50 }}></div>
                <div style={{ fontSize: 11, borderTop: '1px dotted #999', paddingTop: 4, marginTop: 8 }}>ชื่อ: .................................................. วันที่: ....................</div>
              </td>
            </tr>
          </tbody>
        </table>

        <div style={{ marginTop: 12, textAlign: 'right', fontSize: 10, color: '#999' }}>
          พิมพ์เมื่อ: {formatDateTime(new Date().toISOString())} | DOWA IT System | FR-IT-01 Rev.00
        </div>
      </div>
    </>
  )
}
