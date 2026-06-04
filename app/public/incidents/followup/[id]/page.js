'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import { formatDateTime } from '@/lib/dateFormat'

export default function PublicIncidentFollowupPage() {
  const { id } = useParams()
  const searchParams = useSearchParams()
  const token = String(searchParams.get('token') || '').trim()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [incident, setIncident] = useState(null)
  const [workflowSteps, setWorkflowSteps] = useState([])
  const [expiresAt, setExpiresAt] = useState('')

  useEffect(() => {
    const load = async () => {
      if (!token) {
        setError('ไม่พบลิงก์ติดตามเคส (token)')
        setLoading(false)
        return
      }
      try {
        const res = await fetch(`/api/incidents/followup?token=${encodeURIComponent(token)}&incidentId=${encodeURIComponent(id)}`)
        const data = await res.json()
        if (!res.ok) {
          setError(data?.error || 'ไม่สามารถเปิดลิงก์ติดตามเคสได้')
          setLoading(false)
          return
        }
        setIncident(data.incident || null)
        setWorkflowSteps(data.workflowSteps || [])
        setExpiresAt(data?.token?.expiresAt || '')
      } catch (err) {
        setError('เกิดข้อผิดพลาดในการเชื่อมต่อ')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, token])

  if (loading) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>กำลังโหลดข้อมูลเคส...</div>
  }

  if (error || !incident) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: '#f8fafc' }}>
        <div style={{ maxWidth: 560, width: '100%', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 24 }}>
          <h1 style={{ margin: 0, marginBottom: 12, fontSize: 20, color: '#dc2626' }}>ไม่สามารถเปิดลิงก์ติดตามเคสได้</h1>
          <p style={{ margin: 0, color: '#475569', lineHeight: 1.7 }}>{error || 'ไม่พบข้อมูลเคส'}</p>
        </div>
      </div>
    )
  }

  const currentStep = workflowSteps.find((s) => s.status === 'pending')
  const infoRowStyle = { border: '1px solid #e2e8f0', borderRadius: 12, padding: '10px 12px', background: '#fff' }
  const labelStyle = { fontSize: 11, fontWeight: 800, letterSpacing: 0.4, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }
  const valueStyle = { fontSize: 16, fontWeight: 700, color: '#0f172a', lineHeight: 1.5 }
  const sectionTitleStyle = { margin: 0, marginBottom: 14, fontSize: 18, color: '#0f172a', fontWeight: 900 }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)', padding: '28px 16px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ marginBottom: 16, border: '1px solid #bfdbfe', background: '#eff6ff', color: '#1e40af', borderRadius: 12, padding: '10px 14px', fontSize: 13, fontWeight: 700 }}>
          External Follow-up Mode: โหมดติดตามเคสแบบอ่านอย่างเดียว
          {expiresAt ? ` (ลิงก์หมดอายุ ${formatDateTime(expiresAt)})` : ''}
        </div>

        <div style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: 16, padding: 22, marginBottom: 16, boxShadow: '0 8px 24px rgba(15, 23, 42, 0.05)' }}>
          <div style={{ fontSize: 11, fontWeight: 900, color: '#64748b', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>Incident Case</div>
          <h1 style={{ margin: 0, marginBottom: 6, fontSize: 36, lineHeight: 1.1, color: '#0f172a', fontWeight: 900 }}>{incident.case_number}</h1>
          <div style={{ color: '#1e293b', fontSize: 22, fontWeight: 700, marginBottom: 12, lineHeight: 1.4 }}>{incident.title}</div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 800, color: '#1d4ed8', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 999, padding: '6px 12px' }}>
            <span style={{ width: 8, height: 8, borderRadius: 99, background: '#1d4ed8' }} />
            สถานะปัจจุบัน: {incident.status || '-'}
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 20, marginBottom: 16, boxShadow: '0 8px 20px rgba(15, 23, 42, 0.04)' }}>
          <h2 style={sectionTitleStyle}>Section 1: รายละเอียดเคส</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
            <div style={infoRowStyle}><div style={labelStyle}>ผู้แจ้ง</div><div style={valueStyle}>{incident.reported_by || '-'}</div></div>
            <div style={infoRowStyle}><div style={labelStyle}>อีเมลผู้แจ้ง</div><div style={{ ...valueStyle, fontSize: 15 }}>{incident.reporter_email || '-'}</div></div>
            <div style={infoRowStyle}><div style={labelStyle}>ความรุนแรง</div><div style={valueStyle}>{incident.severity || '-'}</div></div>
            <div style={infoRowStyle}><div style={labelStyle}>ระบบที่กระทบ</div><div style={valueStyle}>{incident.affected_system || '-'}</div></div>
            <div style={infoRowStyle}><div style={labelStyle}>วันที่แจ้ง</div><div style={{ ...valueStyle, fontSize: 15 }}>{incident.created_at ? formatDateTime(incident.created_at) : '-'}</div></div>
            <div style={infoRowStyle}><div style={labelStyle}>ผู้รับผิดชอบ</div><div style={valueStyle}>{incident.assigned_to || '-'}</div></div>
          </div>
          <div style={{ marginTop: 14, ...infoRowStyle }}>
            <div style={labelStyle}>อาการที่พบ</div>
            <div style={{ ...valueStyle, fontWeight: 500 }}>{incident.description || '-'}</div>
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 20, marginBottom: 16, boxShadow: '0 8px 20px rgba(15, 23, 42, 0.04)' }}>
          <h2 style={sectionTitleStyle}>Section 2: รายละเอียดการแก้ไข</h2>
          <div style={{ display: 'grid', gap: 10 }}>
            <div style={infoRowStyle}>
              <div style={labelStyle}>Root Cause Analysis</div>
              <div style={{ ...valueStyle, fontWeight: 500 }}>{incident.root_cause || <span style={{ color: '#94a3b8' }}>— ยังไม่มีข้อมูล —</span>}</div>
            </div>
            <div style={infoRowStyle}>
              <div style={labelStyle}>วิธีการแก้ไข / Resolution</div>
              <div style={{ ...valueStyle, fontWeight: 500 }}>{incident.resolution || <span style={{ color: '#94a3b8' }}>— ยังไม่มีข้อมูล —</span>}</div>
            </div>
            <div style={infoRowStyle}>
              <div style={labelStyle}>การป้องกัน / Corrective Action</div>
              <div style={{ ...valueStyle, fontWeight: 500 }}>{incident.corrective_action || <span style={{ color: '#94a3b8' }}>— ยังไม่มีข้อมูล —</span>}</div>
            </div>
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 20, boxShadow: '0 8px 20px rgba(15, 23, 42, 0.04)' }}>
          <h2 style={sectionTitleStyle}>Section 3: ความคืบหน้า</h2>
          <div style={{ fontSize: 14, color: '#475569', marginBottom: 10, fontWeight: 700 }}>
            {currentStep ? `ขั้นตอนปัจจุบัน: ${currentStep.role_required}` : 'ไม่มีขั้นตอนค้างรอ'}
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            {workflowSteps.length === 0 && <div style={{ ...infoRowStyle, fontSize: 13, color: '#94a3b8' }}>ยังไม่มีข้อมูล workflow</div>}
            {workflowSteps.map((s, idx) => (
              <div key={s.id || idx} style={{ ...infoRowStyle, fontSize: 13, color: '#334155', display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontWeight: 700 }}>Step {s.step_order}: {s.role_required}</span>
                <span style={{ fontWeight: 800, color: s.status === 'approved' ? '#059669' : s.status === 'pending' ? '#1d4ed8' : '#475569' }}>{s.status}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          <Link href="/" style={{ color: '#2563eb', fontSize: 13, textDecoration: 'none' }}>กลับหน้าเข้าสู่ระบบ</Link>
        </div>
      </div>
    </div>
  )
}
