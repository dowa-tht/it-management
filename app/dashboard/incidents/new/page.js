'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getNextNo, updateLastNo } from '@/lib/noSeries'

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

export default function NewIncidentPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [loadingNo, setLoadingNo] = useState(true)
  const [caseNo, setCaseNo] = useState('')
  const [manualNos, setManualNos] = useState(false)
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

  useEffect(() => {
    loadNoSeries()
  }, [])

  const loadNoSeries = async () => {
    setLoadingNo(true)
    try {
      const data = await getNextNo('INC')
      if (data) {
        setCaseNo(data.nextNo)
        setManualNos(data.series.manual_nos || false)
      } else {
        // Fallback ถ้าไม่มี No. Series
        const now = new Date()
        const yy = String(now.getFullYear()).slice(2)
        const mm = String(now.getMonth() + 1).padStart(2, '0')
        const rand = String(Math.floor(Math.random() * 900) + 100)
        setCaseNo(`DTT-INC-${yy}${mm}-${rand}`)
      }
    } catch {
      const now = new Date()
      setCaseNo(`INC-${now.getTime()}`)
    }
    setLoadingNo(false)
  }

  const validate = () => {
    const newErrors = {}
    if (!form.title.trim()) newErrors.title = 'กรุณากรอกหัวข้อ Incident'
    if (!form.severity) newErrors.severity = 'กรุณาเลือกระดับความรุนแรง'
    if (!caseNo.trim()) newErrors.caseNo = 'กรุณาระบุเลขที่เอกสาร'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)

    try {
      // Insert Incident
      const { error } = await supabase.from('incidents').insert([{
        ...form,
        case_number: caseNo,
      }])

      if (error) throw error

      // อัปเดต Last No. Used ใน No. Series
      try {
        await updateLastNo('INC', caseNo)
      } catch (noErr) {
        console.warn('No Series update error:', noErr)
      }

      router.push('/dashboard/incidents')

    } catch (err) {
      console.error(err)
      alert('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง')
      setLoading(false)
    }
  }

  const getSLAInfo = () => {
    if (form.severity === 'High') return { response: 'ทันที (ภายใน 1 ชั่วโมง)', resolve: 'ภายใน 4 ชั่วโมง', color: '#dc2626', bg: '#fee2e2' }
    if (form.severity === 'Medium') return { response: 'ภายใน 2 ชั่วโมง', resolve: 'ภายใน 8 ชั่วโมง', color: '#d97706', bg: '#fef3c7' }
    return { response: 'ภายใน 6 ชั่วโมง', resolve: 'ภายใน 3 วันทำการ', color: '#059669', bg: '#d1fae5' }
  }

  const sla = getSLAInfo()

  const inputStyle = (key) => ({
    width: '100%', padding: '9px 12px',
    border: `1px solid ${errors[key] ? '#fca5a5' : '#d1d5db'}`,
    borderRadius: 8, fontSize: 14, fontFamily: 'inherit',
    background: errors[key] ? '#fff5f5' : '#fff',
    outline: 'none', transition: 'border-color 0.15s'
  })

  const selectStyle = {
    width: '100%', padding: '9px 12px',
    border: '1px solid #d1d5db', borderRadius: 8,
    fontSize: 14, fontFamily: 'inherit', background: '#fff',
    outline: 'none', cursor: 'pointer'
  }

  const textareaStyle = {
    width: '100%', padding: '9px 12px',
    border: '1px solid #d1d5db', borderRadius: 8,
    fontSize: 14, fontFamily: 'inherit', resize: 'vertical',
    outline: 'none', lineHeight: 1.6
  }

  const labelStyle = {
    fontSize: 12, fontWeight: 500, color: '#374151',
    display: 'block', marginBottom: 6
  }

  const errorStyle = {
    fontSize: 11, color: '#dc2626', marginTop: 4
  }

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
        <Link href="/dashboard/incidents" style={{ color: '#6b7280', fontSize: 13, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
          ← กลับ
        </Link>
        <div style={{ width: 1, height: 16, background: '#e5e7eb' }} />
        <h1 style={{ fontSize: 18, fontWeight: 600, color: '#111827', margin: 0 }}>
          เพิ่ม Incident ใหม่
        </h1>
      </div>

      <form onSubmit={handleSubmit}>

        {/* Section 1: เลขที่เอกสาร */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>
            <span>📋</span> เลขที่เอกสาร
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>
                Case Number
                {loadingNo && <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 6 }}>กำลังโหลด...</span>}
                {!manualNos && !loadingNo && <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 6 }}>(Auto Generate)</span>}
                {manualNos && !loadingNo && <span style={{ fontSize: 11, color: '#059669', marginLeft: 6 }}>(แก้ไขได้)</span>}
              </label>
              <input
                value={caseNo}
                onChange={e => setCaseNo(e.target.value)}
                readOnly={!manualNos}
                style={{
                  ...inputStyle('caseNo'),
                  background: manualNos ? '#fff' : '#f9fafb',
                  color: '#374151',
                  fontFamily: 'monospace',
                  fontWeight: 600,
                  letterSpacing: 0.5
                }}
              />
              {errors.caseNo && <div style={errorStyle}>{errors.caseNo}</div>}
              {manualNos && (
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>
                  💡 Manual Mode: สามารถแก้ไขเลขที่เอกสารได้ เช่น เพิ่ม "." ต่อท้าย
                </div>
              )}
            </div>
            <div>
              <label style={labelStyle}>อ้างอิงเอกสาร</label>
              <input
                value="FR-IT-01"
                readOnly
                style={{ ...inputStyle(''), background: '#f9fafb', color: '#6b7280', fontFamily: 'monospace' }}
              />
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
            <label style={labelStyle}>หัวข้อ Incident <span style={{ color: '#dc2626' }}>*</span></label>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder="อธิบายอาการหรือปัญหาที่พบโดยย่อ"
              style={inputStyle('title')}
            />
            {errors.title && <div style={errorStyle}>{errors.title}</div>}
          </div>

          {/* Description */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>รายละเอียด / อาการที่พบ</label>
            <textarea
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              rows={4}
              placeholder="อธิบายรายละเอียดของปัญหา อาการที่พบ ขั้นตอนที่ทำให้เกิดปัญหา..."
              style={textareaStyle}
            />
          </div>

          {/* Severity + Status */}
          <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>ระดับความรุนแรง <span style={{ color: '#dc2626' }}>*</span></label>
              <select
                value={form.severity}
                onChange={e => setForm({ ...form, severity: e.target.value })}
                style={selectStyle}
              >
                {SEVERITY_OPTIONS.map(o => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
              {errors.severity && <div style={errorStyle}>{errors.severity}</div>}
            </div>
            <div>
              <label style={labelStyle}>สถานะ</label>
              <select
                value={form.status}
                onChange={e => setForm({ ...form, status: e.target.value })}
                style={selectStyle}
              >
                {STATUS_OPTIONS.map(o => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Category + System */}
          <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>ประเภท Incident</label>
              <select
                value={form.category}
                onChange={e => setForm({ ...form, category: e.target.value })}
                style={selectStyle}
              >
                <option value="">— เลือกประเภท —</option>
                {CATEGORY_OPTIONS.map(o => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>ระบบที่ได้รับผลกระทบ</label>
              <select
                value={form.affected_system}
                onChange={e => setForm({ ...form, affected_system: e.target.value })}
                style={selectStyle}
              >
                <option value="">— เลือกระบบ —</option>
                {SYSTEM_OPTIONS.map(o => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* SLA Preview */}
        <div style={{
          background: sla.bg, border: `1px solid ${sla.color}30`,
          borderRadius: 10, padding: '14px 18px', marginBottom: 16,
          display: 'flex', gap: 24, flexWrap: 'wrap'
        }}>
          <div style={{ fontSize: 12, color: sla.color, fontWeight: 600 }}>
            SLA — {form.severity}
          </div>
          <div style={{ fontSize: 12, color: '#374151' }}>
            ⏱ Response Time: <strong>{sla.response}</strong>
          </div>
          <div style={{ fontSize: 12, color: '#374151' }}>
            ✅ Resolution Time: <strong>{sla.resolve}</strong>
          </div>
        </div>

        {/* Section 3: ผู้รับผิดชอบ */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>
            <span>👤</span> ผู้รับผิดชอบ
          </div>
          <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>ผู้แจ้ง / Reported By</label>
              <input
                type="text"
                value={form.reported_by}
                onChange={e => setForm({ ...form, reported_by: e.target.value })}
                placeholder="ชื่อผู้แจ้งปัญหา"
                style={inputStyle('')}
              />
            </div>
            <div>
              <label style={labelStyle}>ผู้รับผิดชอบ / Assigned To</label>
              <input
                type="text"
                value={form.assigned_to}
                onChange={e => setForm({ ...form, assigned_to: e.target.value })}
                placeholder="ชื่อผู้รับผิดชอบแก้ไข"
                style={inputStyle('')}
              />
            </div>
          </div>
        </div>

        {/* Section 4: การวิเคราะห์ (Optional) */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>
            <span>🔍</span> การวิเคราะห์และแก้ไข
            <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 400 }}>(กรอกได้ภายหลัง)</span>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Root Cause Analysis</label>
            <textarea
              value={form.root_cause}
              onChange={e => setForm({ ...form, root_cause: e.target.value })}
              rows={3}
              placeholder="วิเคราะห์สาเหตุที่แท้จริงของปัญหา..."
              style={textareaStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>วิธีการแก้ไข / Resolution</label>
            <textarea
              value={form.resolution}
              onChange={e => setForm({ ...form, resolution: e.target.value })}
              rows={3}
              placeholder="อธิบายวิธีการที่ใช้แก้ไขปัญหา..."
              style={textareaStyle}
            />
          </div>
        </div>

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
            {loading ? 'กำลังบันทึก...' : loadingNo ? 'กำลังโหลดเลขที่...' : '💾 บันทึก Incident'}
          </button>
        </div>
      </form>
    </div>
  )
}