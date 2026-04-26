'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getNextNo, updateLastNo } from '@/lib/noSeries'
import { formatDateTime } from '@/lib/dateFormat'

const SEVERITY_OPTIONS = ['High', 'Medium', 'Low']
const STATUS_OPTIONS = ['Open', 'In Progress', 'Resolved']
const CATEGORY_OPTIONS = [
  'Hardware', 'Software', 'Network', 'Security',
  'Microsoft 365', 'Backup & Recovery', 'CCTV', 'Phone System', 'อื่นๆ'
]
const SYSTEM_OPTIONS = [
  'Server', 'Synology NAS', 'Cisco Meraki', 'HPE Aruba',
  'Microsoft 365', 'Exchange Online', 'OneDrive', 'SharePoint',
  'Microsoft Teams', 'CheckMK', 'Yeastar PBX', 'CCTV / NVR',
  'Endpoint / PC', 'อื่นๆ'
]

// รายชื่อผู้รับผิดชอบ — เพิ่มชื่อได้ที่นี่
const ASSIGNEE_OPTIONS = [
  'Natthawut Hapang',
]

// SLA ตาม severity (นาที)
const SLA_MINUTES = {
  High:   { response: 60,        resolve: 240 },
  Medium: { response: 120,       resolve: 480 },
  Low:    { response: 360,       resolve: 4320 }, // 3 วันทำการ
}

const SLA_LABELS = {
  High:   { response: 'ทันที (ภายใน 1 ชั่วโมง)', resolve: 'ภายใน 4 ชั่วโมง' },
  Medium: { response: 'ภายใน 2 ชั่วโมง',          resolve: 'ภายใน 8 ชั่วโมง' },
  Low:    { response: 'ภายใน 6 ชั่วโมง',          resolve: 'ภายใน 3 วันทำการ' },
}

// คำนวณเวลาที่ผ่านไปจากตอนนี้
function calcElapsedMinutes(from) {
  if (!from) return null
  return Math.floor((new Date() - new Date(from)) / 60000)
}

function formatElapsed(minutes) {
  if (minutes === null) return '—'
  if (minutes < 60) return `${minutes} นาที`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h} ชม. ${m} นาที` : `${h} ชม.`
}

function SLABadge({ actual, limit, label }) {
  if (actual === null) return (
    <div style={{ fontSize: 12, color: '#9ca3af' }}>ยังไม่ได้วัด</div>
  )
  const ok = actual <= limit
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{
        fontSize: 16,
        color: ok ? '#059669' : '#dc2626'
      }}>
        {ok ? '✅' : '⏰'}
      </span>
      <div>
        <div style={{ fontSize: 12, color: ok ? '#059669' : '#dc2626', fontWeight: 500 }}>
          {formatElapsed(actual)} {ok ? '(ใน SLA)' : '(เกิน SLA)'}
        </div>
        <div style={{ fontSize: 11, color: '#9ca3af' }}>เป้าหมาย: {label}</div>
      </div>
    </div>
  )
}

export default function NewIncidentPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [loadingNo, setLoadingNo] = useState(true)
  const [caseNo, setCaseNo] = useState('')
  const [manualNos, setManualNos] = useState(false)
  const [createdAt] = useState(new Date().toISOString())
  const [form, setForm] = useState({
    title: '',
    description: '',
    severity: 'Medium',
    status: 'Open',
    category: '',
    affected_system: '',
    reported_by: '',
    assigned_to: '',
    root_cause: '',
    resolution: '',
  })
  const [errors, setErrors] = useState({})

  useEffect(() => { loadNoSeries() }, [])

  // ถ้ามีผู้รับผิดชอบ → เปลี่ยนสถานะเป็น In Progress อัตโนมัติ
  useEffect(() => {
    if (form.assigned_to) {
      setForm(prev => ({ ...prev, status: 'In Progress' }))
    } else {
      setForm(prev => ({ ...prev, status: 'Open' }))
    }
  }, [form.assigned_to])

  const loadNoSeries = async () => {
    setLoadingNo(true)
    try {
      const data = await getNextNo('INC')
      if (data) {
        setCaseNo(data.nextNo)
        setManualNos(data.series.manual_nos || false)
      } else {
        const now = new Date()
        const yy = String(now.getFullYear()).slice(2)
        const mm = String(now.getMonth() + 1).padStart(2, '0')
        const rand = String(Math.floor(Math.random() * 900) + 100)
        setCaseNo(`DTT-INC-${yy}${mm}-${rand}`)
      }
    } catch {
      setCaseNo(`INC-${Date.now()}`)
    }
    setLoadingNo(false)
  }

  const validate = () => {
    const newErrors = {}
    if (!caseNo.trim())          newErrors.caseNo = 'กรุณาระบุเลขที่เอกสาร'
    if (!form.title.trim())      newErrors.title = 'กรุณากรอกหัวข้อ Incident'
    if (!form.description.trim()) newErrors.description = 'กรุณากรอกรายละเอียด / อาการที่พบ'
    if (!form.severity)          newErrors.severity = 'กรุณาเลือกระดับความรุนแรง'
    if (!form.category)          newErrors.category = 'กรุณาเลือกประเภท Incident'
    if (!form.affected_system)   newErrors.affected_system = 'กรุณาเลือกระบบที่ได้รับผลกระทบ'
    if (!form.reported_by.trim()) newErrors.reported_by = 'กรุณากรอกชื่อผู้แจ้ง'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) {
      // Scroll to first error
      const firstErr = document.querySelector('[data-error="true"]')
      if (firstErr) firstErr.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    setLoading(true)

    try {
      const { error } = await supabase.from('incidents').insert([{
        ...form,
        case_number: caseNo,
        created_at: createdAt,
      }])
      if (error) throw error

      // อัปเดต No. Series
      try { await updateLastNo('INC', caseNo) } catch {}

      // บันทึก Transaction Log เริ่มต้น
      const { data: newInc } = await supabase
        .from('incidents').select('id').eq('case_number', caseNo).single()
      if (newInc?.id) {
        await supabase.from('incident_logs').insert([{
          incident_id: newInc.id,
          action: 'สร้างเคสใหม่',
          from_status: null,
          to_status: form.status,
          note: `แจ้งโดย: ${form.reported_by}`,
          user_email: form.reported_by,
        }])
        if (form.assigned_to) {
          await supabase.from('incident_logs').insert([{
            incident_id: newInc.id,
            action: 'กำหนดผู้รับผิดชอบ',
            from_status: 'Open',
            to_status: 'In Progress',
            note: `มอบหมายให้: ${form.assigned_to}`,
            user_email: form.reported_by,
          }])
        }
      }

      router.push('/dashboard/incidents')
    } catch (err) {
      console.error(err)
      alert('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง')
      setLoading(false)
    }
  }

  const getSLA = () => SLA_LABELS[form.severity] || SLA_LABELS['Medium']
  const getSLAMin = () => SLA_MINUTES[form.severity] || SLA_MINUTES['Medium']
  const elapsedResponse = calcElapsedMinutes(createdAt)

  // Styles
  const inputStyle = (key) => ({
    width: '100%', padding: '9px 12px',
    border: `1px solid ${errors[key] ? '#fca5a5' : '#d1d5db'}`,
    borderRadius: 8, fontSize: 14, fontFamily: 'inherit',
    background: errors[key] ? '#fff5f5' : '#fff',
    outline: 'none',
  })

  const selectStyle = (key) => ({
    width: '100%', padding: '9px 12px',
    border: `1px solid ${errors[key] ? '#fca5a5' : '#d1d5db'}`,
    borderRadius: 8, fontSize: 14, fontFamily: 'inherit',
    background: errors[key] ? '#fff5f5' : '#fff',
    outline: 'none', cursor: 'pointer',
  })

  const textareaStyle = (key) => ({
    width: '100%', padding: '9px 12px',
    border: `1px solid ${errors[key] ? '#fca5a5' : '#d1d5db'}`,
    borderRadius: 8, fontSize: 14, fontFamily: 'inherit',
    resize: 'vertical', outline: 'none', lineHeight: 1.6,
    background: errors[key] ? '#fff5f5' : '#fff',
  })

  const labelStyle = {
    fontSize: 12, fontWeight: 500, color: '#374151',
    display: 'block', marginBottom: 6
  }

  const requiredMark = <span style={{ color: '#dc2626' }}> *</span>

  const errorMsg = (key) => errors[key] && (
    <div data-error="true" style={{ fontSize: 11, color: '#dc2626', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
      ⚠ {errors[key]}
    </div>
  )

  const sectionStyle = {
    background: '#fff', borderRadius: 10,
    border: '1px solid #e5e7eb', padding: 20, marginBottom: 16
  }

  const sectionTitleStyle = {
    fontSize: 13, fontWeight: 600, color: '#374151',
    marginBottom: 16, paddingBottom: 10,
    borderBottom: '1px solid #f3f4f6',
    display: 'flex', alignItems: 'center', gap: 8
  }

  return (
    <div style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Link href="/dashboard/incidents" style={{ color: '#6b7280', fontSize: 13, textDecoration: 'none' }}>
          ← กลับ
        </Link>
        <div style={{ width: 1, height: 16, background: '#e5e7eb' }} />
        <h1 style={{ fontSize: 18, fontWeight: 600, color: '#111827', margin: 0 }}>เพิ่ม Incident ใหม่</h1>
      </div>

      <form onSubmit={handleSubmit} noValidate>

        {/* Section 1: เลขที่เอกสาร */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>
            <span>📋</span> เลขที่เอกสาร
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>
                Case Number{requiredMark}
                {loadingNo
                  ? <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 6, fontWeight: 400 }}>กำลังโหลด...</span>
                  : manualNos
                    ? <span style={{ fontSize: 11, color: '#059669', marginLeft: 6, fontWeight: 400 }}>✏️ แก้ไขได้</span>
                    : <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 6, fontWeight: 400 }}>(Auto)</span>
                }
              </label>
              <input
                value={caseNo}
                onChange={e => setCaseNo(e.target.value)}
                readOnly={!manualNos}
                style={{
                  ...inputStyle('caseNo'),
                  background: manualNos ? '#fff' : '#f9fafb',
                  fontFamily: 'monospace',
                  fontWeight: 600,
                  letterSpacing: 0.5
                }}
              />
              {errorMsg('caseNo')}
              {manualNos && (
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>
                  💡 Manual Mode: แก้ไขได้ เช่น เพิ่ม "." ต่อท้าย
                </div>
              )}
            </div>
            <div>
              <label style={labelStyle}>อ้างอิงเอกสาร</label>
              <input value="FR-IT-01" readOnly
                style={{ ...inputStyle(''), background: '#f9fafb', color: '#6b7280', fontFamily: 'monospace' }} />
            </div>
          </div>
        </div>

        {/* Section 2: ข้อมูลหลัก */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>
            <span>⚠️</span> ข้อมูลหลัก
          </div>

          {/* Title */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>หัวข้อ Incident{requiredMark}</label>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder="อธิบายอาการหรือปัญหาที่พบโดยย่อ"
              style={inputStyle('title')}
            />
            {errorMsg('title')}
          </div>

          {/* Description */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>รายละเอียด / อาการที่พบ{requiredMark}</label>
            <textarea
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              rows={4}
              placeholder="อธิบายรายละเอียดของปัญหา อาการที่พบ ขั้นตอนที่ทำให้เกิดปัญหา..."
              style={textareaStyle('description')}
            />
            {errorMsg('description')}
          </div>

          {/* Severity + Status */}
          <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>ระดับความรุนแรง{requiredMark}</label>
              <select
                value={form.severity}
                onChange={e => setForm({ ...form, severity: e.target.value })}
                style={selectStyle('severity')}
              >
                {SEVERITY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
              {errorMsg('severity')}
            </div>
            <div>
              <label style={labelStyle}>
                สถานะ
                {form.assigned_to && (
                  <span style={{ fontSize: 11, color: '#059669', marginLeft: 6, fontWeight: 400 }}>
                    (ปรับอัตโนมัติเมื่อมีผู้รับผิดชอบ)
                  </span>
                )}
              </label>
              <select
                value={form.status}
                onChange={e => setForm({ ...form, status: e.target.value })}
                style={{ ...selectStyle(''), background: form.assigned_to ? '#f0fdf4' : '#fff' }}
                disabled={!!form.assigned_to}
              >
                {STATUS_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
              {form.assigned_to && (
                <div style={{ fontSize: 11, color: '#059669', marginTop: 4 }}>
                  ✅ เปลี่ยนเป็น "In Progress" เนื่องจากมีผู้รับผิดชอบแล้ว
                </div>
              )}
            </div>
          </div>

          {/* Category + System */}
          <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>ประเภท Incident{requiredMark}</label>
              <select
                value={form.category}
                onChange={e => setForm({ ...form, category: e.target.value })}
                style={selectStyle('category')}
              >
                <option value="">— เลือกประเภท —</option>
                {CATEGORY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
              {errorMsg('category')}
            </div>
            <div>
              <label style={labelStyle}>ระบบที่ได้รับผลกระทบ{requiredMark}</label>
              <select
                value={form.affected_system}
                onChange={e => setForm({ ...form, affected_system: e.target.value })}
                style={selectStyle('affected_system')}
              >
                <option value="">— เลือกระบบ —</option>
                {SYSTEM_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
              {errorMsg('affected_system')}
            </div>
          </div>
        </div>

        {/* Section 3: SLA Preview */}
        <div style={{
          background: '#fff', borderRadius: 10,
          border: '1px solid #e5e7eb', padding: 20, marginBottom: 16
        }}>
          <div style={sectionTitleStyle}>
            <span>⏱</span> SLA — {form.severity}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div>
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6, fontWeight: 500 }}>Response Time</div>
              <div style={{ fontSize: 12, color: '#374151', marginBottom: 8 }}>
                เป้าหมาย: <strong>{getSLA().response}</strong>
              </div>
              <SLABadge
                actual={elapsedResponse}
                limit={getSLAMin().response}
                label={getSLA().response}
              />
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6, fontWeight: 500 }}>Resolution Time</div>
              <div style={{ fontSize: 12, color: '#374151', marginBottom: 8 }}>
                เป้าหมาย: <strong>{getSLA().resolve}</strong>
              </div>
              <div style={{ fontSize: 12, color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>⏳</span> นับเมื่อปิดเคส
              </div>
            </div>
          </div>
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f3f4f6', fontSize: 11, color: '#9ca3af' }}>
            เวลาที่ผ่านมาตั้งแต่สร้างเคส: <strong>{formatElapsed(elapsedResponse)}</strong>
            {' · '}สร้างเมื่อ: {formatDateTime(createdAt)}
          </div>
        </div>

        {/* Section 4: ผู้รับผิดชอบ */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>
            <span>👤</span> ผู้รับผิดชอบ
          </div>
          <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>ผู้แจ้ง / Reported By{requiredMark}</label>
              <input
                type="text"
                value={form.reported_by}
                onChange={e => setForm({ ...form, reported_by: e.target.value })}
                placeholder="ชื่อผู้แจ้งปัญหา"
                style={inputStyle('reported_by')}
              />
              {errorMsg('reported_by')}
            </div>
            <div>
              <label style={labelStyle}>
                ผู้รับผิดชอบ / Assigned To
                <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 4, fontWeight: 400 }}>(ไม่บังคับ)</span>
              </label>
              <select
                value={form.assigned_to}
                onChange={e => setForm({ ...form, assigned_to: e.target.value })}
                style={selectStyle('')}
              >
                <option value="">— ยังไม่ได้มอบหมาย —</option>
                {ASSIGNEE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
              {form.assigned_to && (
                <div style={{ fontSize: 11, color: '#059669', marginTop: 4 }}>
                  ✅ สถานะจะเปลี่ยนเป็น "In Progress" อัตโนมัติ
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section 5: การวิเคราะห์ (Optional) */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>
            <span>🔍</span> การวิเคราะห์และแก้ไข
            <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 400 }}>(ไม่บังคับ — กรอกได้ภายหลัง)</span>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Root Cause Analysis</label>
            <textarea
              value={form.root_cause}
              onChange={e => setForm({ ...form, root_cause: e.target.value })}
              rows={3}
              placeholder="วิเคราะห์สาเหตุที่แท้จริงของปัญหา..."
              style={textareaStyle('')}
            />
          </div>
          <div>
            <label style={labelStyle}>วิธีการแก้ไข / Resolution</label>
            <textarea
              value={form.resolution}
              onChange={e => setForm({ ...form, resolution: e.target.value })}
              rows={3}
              placeholder="อธิบายวิธีการที่ใช้แก้ไขปัญหา..."
              style={textareaStyle('')}
            />
          </div>
        </div>

        {/* Error Summary */}
        {Object.keys(errors).length > 0 && (
          <div style={{
            background: '#fee2e2', border: '1px solid #fca5a5',
            borderRadius: 10, padding: '12px 16px', marginBottom: 16
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#991b1b', marginBottom: 6 }}>
              ⚠️ กรุณากรอกข้อมูลให้ครบถ้วน
            </div>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {Object.values(errors).map((e, i) => (
                <li key={i} style={{ fontSize: 12, color: '#dc2626', marginBottom: 2 }}>{e}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingBottom: 24 }}>
          <Link href="/dashboard/incidents" style={{
            padding: '10px 20px', border: '1px solid #d1d5db',
            borderRadius: 8, fontSize: 14, color: '#374151',
            textDecoration: 'none', background: '#fff',
            display: 'flex', alignItems: 'center'
          }}>
            ยกเลิก
          </Link>
          <button
            type="submit"
            disabled={loading || loadingNo}
            style={{
              padding: '10px 28px',
              background: loading || loadingNo ? '#93c5fd' : '#1d4ed8',
              color: '#fff', border: 'none', borderRadius: 8,
              fontSize: 14, cursor: loading || loadingNo ? 'not-allowed' : 'pointer',
              fontWeight: 500, fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', gap: 8
            }}
          >
            {loading ? 'กำลังบันทึก...' : loadingNo ? 'กำลังโหลด...' : '💾 บันทึก Incident'}
          </button>
        </div>
      </form>
    </div>
  )
}