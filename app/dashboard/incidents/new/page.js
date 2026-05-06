'use client'
import { useState, useEffect, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { getNextNo, updateLastNo } from '@/lib/noSeries'
import { formatDateTime } from '@/lib/dateFormat'
import { UserAutocomplete } from '../components/UserAutocomplete'

const SLA_MINUTES = {
  High:   { response: 60,   resolve: 240  },
  Medium: { response: 120,  resolve: 480  },
  Low:    { response: 360,  resolve: 4320 },
}
const SLA_LABELS = {
  High:   { response: 'ทันที (ภายใน 1 ชั่วโมง)', resolve: 'ภายใน 4 ชั่วโมง' },
  Medium: { response: 'ภายใน 2 ชั่วโมง',         resolve: 'ภายใน 8 ชั่วโมง' },
  Low:    { response: 'ภายใน 6 ชั่วโมง',         resolve: 'ภายใน 3 วันทำการ' },
}

function calcElapsedNow(from) {
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

function SLAWidget({ label, slaLabel, state, actual }) {
  const cfg = {
    waiting:       { icon: '⏸', color: '#9ca3af', bg: '#f9fafb', border: '#e5e7eb', text: 'รอมอบหมาย' },
    counting:      { icon: '⏳', color: '#d97706', bg: '#fffbeb', border: '#fcd34d', text: `กำลังนับ... (${formatElapsed(actual)} ที่ผ่านมา)` },
    counting_late: { icon: '⏰', color: '#dc2626', bg: '#fef2f2', border: '#fca5a5', text: `เกิน SLA แล้ว! (${formatElapsed(actual)})` },
    done_ok:       { icon: '✅', color: '#059669', bg: '#f0fdf4', border: '#6ee7b7', text: `${formatElapsed(actual)} (ใน SLA)` },
    done_late:     { icon: '⏰', color: '#dc2626', bg: '#fef2f2', border: '#fca5a5', text: `${formatElapsed(actual)} (เกิน SLA)` },
    closed:        { icon: '✔', color: '#059669', bg: '#d1fae5', border: '#6ee7b7', text: 'เสร็จสิ้น/ปิดงาน' },
  }
  const s = cfg[state] || cfg.waiting
  return (
    <div style={{ border: `1px solid ${s.border}`, borderRadius: 8, padding: '12px 14px', background: s.bg }}>
      <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4, fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 8 }}>เป้าหมาย: {slaLabel}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 20 }}>{s.icon}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: s.color }}>{s.text}</span>
      </div>
    </div>
  )
}

function NewIncidentForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [loadingNo, setLoadingNo] = useState(true)
  const [loadingMaster, setLoadingMaster] = useState(true)
  const [caseNo, setCaseNo] = useState('')
  const [manualNos, setManualNos] = useState(false)
  const [createdAt] = useState(new Date().toISOString())

  const [categories, setCategories] = useState([])
  const [systems, setSystems] = useState([])
  const [assignees, setAssignees] = useState([]) // { id, full_name }

  const [form, setForm] = useState({
    title: '', description: '', severity: 'Medium',
    status: 'Open', category: '', affected_system: '',
    reported_by: '', assigned_to: '',
    created_by: null,
    root_cause: '', resolution: '',
    ref_type: null, ref_id: null, ref_doc_no: null, ref_doc_id: null
  })
  const [assignedAt, setAssignedAt] = useState(null)
  const [errors, setErrors] = useState({})
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    loadNoSeries()
    loadMasterData()
    handleChecklistRef()
    const timer = setInterval(() => setElapsed(calcElapsedNow(createdAt)), 30000)
    return () => clearInterval(timer)
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

  useEffect(() => {
    setElapsed(calcElapsedNow(createdAt))
  }, [createdAt])

  useEffect(() => {
    if (form.assigned_to) {
      setForm(prev => ({ ...prev, status: 'In Progress' }))
      if (!assignedAt) setAssignedAt(new Date().toISOString())
    } else {
      setForm(prev => ({ ...prev, status: 'Open' }))
      setAssignedAt(null)
    }
  }, [form.assigned_to])

  const loadMasterData = async () => {
    setLoadingMaster(true)
    const { data: master } = await supabase.from('master_data').select('*').eq('is_active', true).order('sort_order', { ascending: true })
    setCategories((master || []).filter(d => d.type === 'incident_category').map(d => d.value))
    setSystems((master || []).filter(d => d.type === 'affected_system').map(d => d.value))
    const { data: assigneeData } = await supabase.from('user_profiles').select('id, full_name').eq('can_be_assignee', true).eq('is_active', true).order('full_name', { ascending: true })
    setAssignees(assigneeData || [])
    setLoadingMaster(false)
  }

  const loadNoSeries = async () => {
    setLoadingNo(true)
    try {
      const data = await getNextNo('INC')
      if (data) { setCaseNo(data.nextNo); setManualNos(data.series.manual_nos || false) }
      else {
        const now = new Date()
        const yy = String(now.getFullYear()).slice(2)
        const mm = String(now.getMonth() + 1).padStart(2, '0')
        setCaseNo(`DTT-INC-${yy}${mm}-${String(Math.floor(Math.random() * 900) + 100)}`)
      }
    } catch { setCaseNo(`INC-${Date.now()}`) }
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
      const { ref_doc_id, ...insertData } = form
      const { error } = await supabase.from('incidents').insert([{
        ...insertData,
        case_number: caseNo,
        created_at: createdAt,
        assigned_at: assignedAt,
      }])
      if (error) throw error

      try { await updateLastNo('INC', caseNo) } catch {}

      const { data: newInc } = await supabase.from('incidents').select('id').eq('case_number', caseNo).single()
      if (newInc?.id) {
        await supabase.from('incident_logs').insert([{
          incident_id: newInc.id,
          action: 'สร้างเคสใหม่',
          from_status: null,
          to_status: form.status,
          note: `แจ้งโดย: ${form.reported_by}${form.ref_doc_no ? ` (อ้างอิง ${form.ref_doc_no})` : ''}`,
          user_email: form.reported_by,
        }])
        if (form.assigned_to && assignedAt) {
          await supabase.from('incident_logs').insert([{
            incident_id: newInc.id,
            action: 'กำหนดผู้รับผิดชอบ',
            from_status: 'Open',
            to_status: 'In Progress',
            note: `มอบหมายให้: ${form.assigned_to} · Response Time เริ่มนับแล้ว`,
            user_email: form.reported_by,
          }])
        }

        // --- เพิ่ม Audit Log กลับไปยัง Checklist กรณีมาจากหน้า Checklist ---
        if (form.ref_type === 'checklist' && form.ref_doc_id) {
          await supabase.from('checklist_logs').insert([{
            doc_id: form.ref_doc_id,
            action: `เปิด Incident Case (${caseNo}) หัวข้อ: ${form.title.replace('[Checklist Ref] ', '')}`,
            user_email: form.reported_by || 'System'
          }])
        }
      }
      router.push('/dashboard/incidents')
    } catch (err) {
      console.error(err)
      alert('เกิดข้อผิดพลาด กรุณาลองใหม่')
      setLoading(false)
    }
  }

  const slaMin = SLA_MINUTES[form.severity] || SLA_MINUTES['Medium']
  const slaLabel = SLA_LABELS[form.severity] || SLA_LABELS['Medium']
  const currentElapsed = calcElapsedNow(createdAt)
  const responseState = form.status === 'Closed' ? 'closed' : (!form.assigned_to ? 'waiting' : assignedAt ? 'done_ok' : 'waiting')
  const resolveState = form.status === 'Closed' ? 'closed' : (currentElapsed <= slaMin.resolve ? 'counting' : 'counting_late')

  const inputStyle = (key) => ({
    width: '100%', padding: '9px 12px',
    border: `1px solid ${errors[key] ? '#fca5a5' : '#d1d5db'}`,
    borderRadius: 8, fontSize: 14, fontFamily: 'inherit',
    background: errors[key] ? '#fff5f5' : '#fff', outline: 'none',
  })
  const selectStyle = (key) => ({ ...inputStyle(key), cursor: 'pointer' })
  const sectionStyle = { background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: 20, marginBottom: 16 }
  const sectionTitle = (icon, text, sub = '') => (
    <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 16, paddingBottom: 10, borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: 8 }}>
      {icon} {text} {sub && <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 400 }}>{sub}</span>}
    </div>
  )
  const req = <span style={{ color: '#dc2626' }}> *</span>
  const errMsg = (key) => errors[key] && (
    <div style={{ fontSize: 11, color: '#dc2626', marginTop: 4 }}>⚠ {errors[key]}</div>
  )

  return (
    <div style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Link href="/dashboard/incidents" style={{ color: '#6b7280', fontSize: 13, textDecoration: 'none' }}>← กลับ</Link>
        <div style={{ width: 1, height: 16, background: '#e5e7eb' }} />
        <h1 style={{ fontSize: 18, fontWeight: 600, color: '#111827', margin: 0 }}>เพิ่ม Incident ใหม่</h1>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        {form.ref_doc_no && (
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18 }}>🔗</span>
            <div style={{ fontSize: 13, color: '#1e40af' }}>
              อ้างอิงจาก Checklist: <strong>{form.ref_doc_no}</strong> (ระบบดึงข้อมูลมาให้เบื้องต้นแล้ว)
            </div>
          </div>
        )}

        <div style={sectionStyle}>
          {sectionTitle('📋', 'เลขที่เอกสาร')}
          <div style={{ maxWidth: 350 }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>Case Number{req}</label>
            <input value={caseNo} onChange={e => setCaseNo(e.target.value)} readOnly={!manualNos}
              style={{ ...inputStyle('caseNo'), background: manualNos ? '#fff' : '#f9fafb', fontFamily: 'monospace', fontWeight: 600 }} />
            {errMsg('caseNo')}
          </div>
        </div>

        <div style={sectionStyle}>
          {sectionTitle('⚠️', 'ข้อมูลหลัก')}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>หัวข้อ Incident{req}</label>
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="อธิบายอาการหรือปัญหาที่พบโดยย่อ" style={inputStyle('title')} />
            {errMsg('title')}
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>รายละเอียด / อาการที่พบ{req}</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={4} placeholder="อธิบายรายละเอียดของปัญหา..." style={{ ...inputStyle('description'), resize: 'vertical', lineHeight: 1.6 }} />
            {errMsg('description')}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>ระดับความรุนแรง{req}</label>
              <select value={form.severity} onChange={e => setForm({ ...form, severity: e.target.value })} style={selectStyle('severity')}>
                {['High', 'Medium', 'Low'].map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>สถานะ</label>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} disabled={!!form.assigned_to} style={{ ...selectStyle(''), background: form.assigned_to ? '#f0fdf4' : '#fff' }}>
                {['Open', 'In Progress', 'Closed'].map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>ประเภท Incident{req}</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} style={selectStyle('category')} disabled={loadingMaster}>
                <option value="">{loadingMaster ? 'กำลังโหลด...' : '— เลือกประเภท —'}</option>
                {categories.map(o => <option key={o}>{o}</option>)}
              </select>
              {errMsg('category')}
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>ระบบที่ได้รับผลกระทบ{req}</label>
              <select value={form.affected_system} onChange={e => setForm({ ...form, affected_system: e.target.value })} style={selectStyle('affected_system')} disabled={loadingMaster}>
                <option value="">{loadingMaster ? 'กำลังโหลด...' : '— เลือกระบบ —'}</option>
                {systems.map(o => <option key={o}>{o}</option>)}
              </select>
              {errMsg('affected_system')}
            </div>
          </div>
        </div>

        <div style={sectionStyle}>
          {sectionTitle('👤', 'ผู้รับผิดชอบ')}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>ผู้แจ้ง / Reported By{req}</label>
              <UserAutocomplete 
                value={form.reported_by}
                onChange={(u) => setForm({ ...form, reported_by: u.full_name, created_by: u.id })}
              />
              {errMsg('reported_by')}
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>ผู้รับผิดชอบ / Assigned To</label>
              <select value={form.assigned_to} onChange={e => setForm({ ...form, assigned_to: e.target.value })} style={selectStyle('')} disabled={loadingMaster}>
                <option value="">{loadingMaster ? 'กำลังโหลด...' : '— ยังไม่ได้มอบหมาย —'}</option>
                {assignees.map(a => <option key={a.id} value={a.full_name}>{a.full_name}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div style={sectionStyle}>
          {sectionTitle('⏱', `SLA — ${form.severity}`)}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <SLAWidget label="Response Time" slaLabel={slaLabel.response} state={responseState} actual={calcElapsedNow(assignedAt || createdAt)} />
            <SLAWidget label="Resolution Time" slaLabel={slaLabel.resolve} state={resolveState} actual={currentElapsed} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingBottom: 24 }}>
          <Link href="/dashboard/incidents" style={{ padding: '10px 20px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, color: '#374151', textDecoration: 'none', background: '#fff' }}>ยกเลิก</Link>
          <button type="submit" disabled={loading} style={{ padding: '10px 28px', background: loading ? '#93c5fd' : '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, cursor: 'pointer', fontWeight: 500 }}>
            {loading ? 'กำลังบันทึก...' : '💾 บันทึก Incident'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default function NewIncidentPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>กำลังโหลดแบบฟอร์ม...</div>}>
      <NewIncidentForm />
    </Suspense>
  )
}
