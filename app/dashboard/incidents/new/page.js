'use client'
import { useState, useEffect, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createIncident } from '@/app/actions/incidents'
import { getVerifiedNextNo } from '@/app/actions/noSeries'
import { getNextNo } from '@/lib/noSeries'
import { UserAutocomplete } from '../components/UserAutocomplete'

function NewIncidentForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [loadingNo, setLoadingNo] = useState(true)
  const [loadingMaster, setLoadingMaster] = useState(true)
  const [caseNo, setCaseNo] = useState('')
  const [manualNos, setManualNos] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)

  const [categories, setCategories] = useState([])
  const [systems, setSystems] = useState([])

  const [form, setForm] = useState({
    title: '', 
    description: '', 
    severity: 'Medium',
    status: 'Open', 
    category: '', 
    affected_system: '',
    reported_by: '', 
    reported_by_id: null,
    ref_type: null, 
    ref_id: null, 
    ref_doc_no: null, 
    ref_doc_id: null
  })
  const [errors, setErrors] = useState({})

  useEffect(() => {
    loadNoSeries()
    loadMasterData()
    loadCurrentUser()
    handleChecklistRef()
  }, [])

  const handleChecklistRef = async () => {
    const refType = searchParams.get('ref_type')
    const refId = searchParams.get('ref_id')
    const docNo = searchParams.get('doc_no')

    if (refType === 'checklist' && refId) {
      const { data: item } = await supabase.from('checklist_items').select('*').eq('id', refId).single()
      if (item) {
        setForm(prev => ({
          ...prev,
          ref_type: 'checklist',
          ref_id: refId,
          ref_doc_no: docNo,
          ref_doc_id: item.doc_id,
          title: `[Checklist Ref] ${item.item_label}`,
          description: `พบปัญหาจากเอกสาร ${docNo}: ${item.notes || '—'}`,
        }))
      }
    }
  }

  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('id, full_name, email, role')
        .eq('id', user.id)
        .single()
      
      if (profile) {
        setCurrentUser(profile)
        setForm(prev => ({
          ...prev,
          reported_by: profile.full_name || user.email,
          reported_by_id: profile.id
        }))
      }
    }
  }

  const loadMasterData = async () => {
    setLoadingMaster(true)
    const { data: master } = await supabase
      .from('master_data')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
    
    setCategories((master || []).filter(d => d.type === 'incident_category').map(d => d.value))
    setSystems((master || []).filter(d => d.type === 'affected_system').map(d => d.value))
    setLoadingMaster(false)
  }

  const loadNoSeries = async () => {
    setLoadingNo(true)
    try {
      const data = await getVerifiedNextNo('INC')
      if (data && !data.error) { 
        setCaseNo(data.nextNo)
        setManualNos(data.series?.manual_nos || false) 
      } else {
        throw new Error(data?.error || 'Failed to fetch no series')
      }
    } catch { 
      setCaseNo(`INC-${Date.now()}`) 
    }
    setLoadingNo(false)
  }

  const validate = () => {
    const e = {}
    if (!caseNo.trim())           e.caseNo = 'กรุณาระบุเลขที่เอกสาร'
    if (!form.title.trim())       e.title = 'กรุณากรอกหัวข้อ Incident'
    if (!form.description.trim()) e.description = 'กรุณากรอกรายละเอียด / อาการที่พบ'
    if (!form.severity)           e.severity = 'กรุณาเลือกระดับความรุนแรง'
    if (!form.category)           e.category = 'กรุณาเลือกประเภท Incident'
    if (!form.affected_system)    e.affected_system = 'กรุณาเลือกระบบที่ได้รับผลกระทบ'
    if (!form.reported_by.trim()) e.reported_by = 'กรุณากรอกชื่อผู้แจ้ง'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (ev) => {
    ev.preventDefault()
    if (!validate()) return
    setLoading(true)

    try {
      const res = await createIncident(form)
      if (res.success) {
        router.push('/dashboard/incidents')
      } else {
        throw new Error(res.error || 'Failed to create incident')
      }
    } catch (err) {
      console.error(err)
      alert(`เกิดข้อผิดพลาด: ${err.message}`)
      setLoading(false)
    }
  }

  const inputStyle = (key) => ({
    width: '100%', padding: '10px 14px',
    border: `1px solid ${errors[key] ? '#fca5a5' : '#e5e7eb'}`,
    borderRadius: 12, fontSize: 14, fontFamily: 'inherit',
    background: errors[key] ? '#fff5f5' : '#fff', outline: 'none',
    transition: 'all 0.2s ease',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  })
  
  const selectStyle = (key) => ({ ...inputStyle(key), cursor: 'pointer' })
  const sectionStyle = { 
    background: '#fff', 
    borderRadius: 16, 
    border: '1px solid #f1f5f9', 
    padding: 24, 
    marginBottom: 20,
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
  }

  const sectionTitle = (icon, text, sub = '') => (
    <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ fontSize: 18 }}>{icon}</span>
      <span>{text}</span>
      {sub && <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 400, marginLeft: 'auto' }}>{sub}</span>}
    </div>
  )

  const req = <span style={{ color: '#ef4444' }}> *</span>
  const canChangeReporter = currentUser?.role === 'admin' || currentUser?.role === 'it_staff'
  const errMsg = (key) => errors[key] && (
    <div style={{ fontSize: 11, color: '#ef4444', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
      <span>⚠️</span> {errors[key]}
    </div>
  )

  return (
    <div style={{ padding: '32px 16px', maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
        <Link href="/dashboard/incidents" style={{ 
          color: '#64748b', 
          fontSize: 13, 
          textDecoration: 'none',
          padding: '8px 12px',
          borderRadius: 8,
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          fontWeight: 500
        }}>
          ← กลับ
        </Link>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: 0 }}>แจ้งปัญหาไอที (New Incident)</h1>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        {form.ref_doc_no && (
          <div style={{ 
            background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', 
            border: '1px solid #bfdbfe', 
            borderRadius: 16, 
            padding: '16px 20px', 
            marginBottom: 24, 
            display: 'flex', 
            alignItems: 'center', 
            gap: 12,
            boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.1)'
          }}>
            <span style={{ fontSize: 24 }}>🔗</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1e40af', marginBottom: 2 }}>เชื่อมโยงจาก Checklist</div>
              <div style={{ fontSize: 13, color: '#3b82f6' }}>หมายเลขเอกสาร: <strong>{form.ref_doc_no}</strong></div>
            </div>
          </div>
        )}

        <div style={sectionStyle}>
          {sectionTitle('📋', 'ข้อมูลพื้นฐาน', 'ระบบจะบันทึกวันที่และเวลาให้อัตโนมัติ')}
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 8 }}>หมายเลขเคส{req}</label>
              <input value={caseNo} onChange={e => setCaseNo(e.target.value)} readOnly={!manualNos}
                style={{ ...inputStyle('caseNo'), background: manualNos ? '#fff' : '#f8fafc', fontWeight: 700, color: '#334155' }} />
              {errMsg('caseNo')}
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 8 }}>สถานะเริ่มต้น</label>
              <div style={{
                padding: '10px 14px', borderRadius: 12, fontSize: 13, fontWeight: 700,
                background: '#f8fafc',
                color: '#64748b',
                border: '1px solid #e2e8f0',
                display: 'inline-flex', alignItems: 'center', height: 42, width: '100%'
              }}>
                <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#94a3b8', marginRight: 10 }}></span>
                Open (รอรับเรื่อง)
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 8 }}>หัวข้อปัญหา / Incident Title{req}</label>
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="เช่น เข้าใช้งานระบบไม่ได้, พิมพ์งานไม่ออก" style={inputStyle('title')} />
            {errMsg('title')}
          </div>

          <div style={{ marginBottom: 0 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 8 }}>รายละเอียดที่พบ{req}</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={4} placeholder="ระบุรายละเอียดของปัญหาเพื่อให้เจ้าหน้าที่ตรวจสอบได้รวดเร็วขึ้น..." style={{ ...inputStyle('description'), resize: 'vertical', lineHeight: 1.6 }} />
            {errMsg('description')}
          </div>
        </div>

        <div style={sectionStyle}>
          {sectionTitle('🔍', 'การคัดกรองเบื้องต้น')}
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 8 }}>ประเภทปัญหา{req}</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} style={selectStyle('category')} disabled={loadingMaster}>
                <option value="">{loadingMaster ? 'กำลังโหลด...' : '— เลือกประเภท —'}</option>
                {categories.map(o => <option key={o}>{o}</option>)}
              </select>
              {errMsg('category')}
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 8 }}>ระบบที่ได้รับผลกระทบ{req}</label>
              <select value={form.affected_system} onChange={e => setForm({ ...form, affected_system: e.target.value })} style={selectStyle('affected_system')} disabled={loadingMaster}>
                <option value="">{loadingMaster ? 'กำลังโหลด...' : '— เลือกระบบ —'}</option>
                {systems.map(o => <option key={o}>{o}</option>)}
              </select>
              {errMsg('affected_system')}
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 8 }}>ความรุนแรง (ประเมินโดยผู้แจ้ง)</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              {['Low', 'Medium', 'High'].map(level => {
                const isActive = form.severity === level
                const colors = {
                  Low: { bg: '#f0fdf4', border: '#bbf7d0', text: '#166534', activeBg: '#22c55e' },
                  Medium: { bg: '#fffbeb', border: '#fef3c7', text: '#92400e', activeBg: '#f59e0b' },
                  High: { bg: '#fef2f2', border: '#fee2e2', text: '#991b1b', activeBg: '#ef4444' }
                }
                const c = colors[level]
                return (
                  <button key={level} type="button" onClick={() => setForm({ ...form, severity: level })} style={{
                    padding: '12px',
                    borderRadius: 12,
                    border: `2px solid ${isActive ? c.activeBg : c.border}`,
                    background: isActive ? c.activeBg : c.bg,
                    color: isActive ? '#fff' : c.text,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}>
                    {level}
                  </button>
                )
              })}
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 10 }}>
              * IT Staff อาจมีการปรับเปลี่ยนระดับความรุนแรงตามมาตรฐานบริษัทเมื่อรับเรื่อง
            </div>
          </div>
        </div>

        <div style={sectionStyle}>
          {sectionTitle('👤', 'ผู้แจ้งปัญหา')}
          <div style={{ maxWidth: 400 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 8 }}>ชื่อผู้แจ้ง / Reported By{req}</label>
            <UserAutocomplete 
              value={{ id: form.reported_by_id, full_name: form.reported_by }}
              onChange={(u) => setForm({ ...form, reported_by: u?.full_name || '', reported_by_id: u?.id || null })}
              disabled={!canChangeReporter}
            />
            {!canChangeReporter && (
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 8 }}>
                ระบบล็อกชื่อผู้แจ้งเป็นบัญชีของคุณ เฉพาะ Administrator หรือ IT Staff เท่านั้นที่เปลี่ยนผู้แจ้งแทนได้
              </div>
            )}
            {errMsg('reported_by')}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 16, justifyContent: 'flex-end', paddingTop: 20 }}>
          <Link href="/dashboard/incidents" style={{ 
            padding: '12px 24px', 
            borderRadius: 12, 
            fontSize: 14, 
            color: '#64748b', 
            textDecoration: 'none', 
            background: '#f1f5f9',
            fontWeight: 600,
            transition: 'all 0.2s ease'
          }}>
            ยกเลิก
          </Link>
          <button type="submit" disabled={loading} style={{ 
            padding: '12px 32px', 
            background: loading ? '#94a3b8' : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', 
            color: '#fff', 
            border: 'none', 
            borderRadius: 12, 
            fontSize: 14, 
            cursor: 'pointer', 
            fontWeight: 700,
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
            transition: 'all 0.2s ease'
          }}>
            {loading ? 'กำลังบันทึก...' : '🚀 บันทึกและส่งแจ้งปัญหา'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default function NewIncidentPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>กำลังโหลดแบบฟอร์ม...</div>}>
      <NewIncidentForm />
    </Suspense>
  )
}
