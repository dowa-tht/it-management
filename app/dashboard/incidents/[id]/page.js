'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { formatDate, formatDateTime } from '@/lib/dateFormat'

const SEVERITY_COLORS = {
  High:   { bg: '#fee2e2', color: '#991b1b' },
  Medium: { bg: '#fef3c7', color: '#92400e' },
  Low:    { bg: '#d1fae5', color: '#065f46' },
}
const STATUS_COLORS = {
  Open:          { bg: '#dbeafe', color: '#1e40af' },
  'In Progress': { bg: '#fef3c7', color: '#92400e' },
  Resolved:      { bg: '#d1fae5', color: '#065f46' },
}
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

function calcMinutes(from, to) {
  if (!from || !to) return null
  return Math.floor((new Date(to) - new Date(from)) / 60000)
}
function calcElapsedNow(from) {
  if (!from) return null
  return Math.floor((new Date() - new Date(from)) / 60000)
}
function formatElapsed(minutes) {
  if (minutes === null || minutes === undefined) return '—'
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

// ===== Signature Canvas =====
function SignatureCanvas({ onSave, onCancel, title }) {
  const canvasRef = useRef(null)
  const [drawing, setDrawing] = useState(false)
  const [hasDrawn, setHasDrawn] = useState(false)

  useEffect(() => {
    const ctx = canvasRef.current.getContext('2d')
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 440, 160)
    ctx.strokeStyle = '#1a3fa0'; ctx.lineWidth = 2
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'
  }, [])

  const getPos = (e, c) => {
    const r = c.getBoundingClientRect()
    const sx = c.width / r.width, sy = c.height / r.height
    if (e.touches) return { x: (e.touches[0].clientX - r.left)*sx, y: (e.touches[0].clientY - r.top)*sy }
    return { x: (e.clientX - r.left)*sx, y: (e.clientY - r.top)*sy }
  }
  const startDraw = (e) => { e.preventDefault(); const ctx = canvasRef.current.getContext('2d'); const p = getPos(e, canvasRef.current); ctx.beginPath(); ctx.moveTo(p.x, p.y); setDrawing(true); setHasDrawn(true) }
  const draw = (e) => { e.preventDefault(); if (!drawing) return; const ctx = canvasRef.current.getContext('2d'); const p = getPos(e, canvasRef.current); ctx.lineTo(p.x, p.y); ctx.stroke() }
  const stopDraw = (e) => { e.preventDefault(); setDrawing(false) }
  const clear = () => { const ctx = canvasRef.current.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 440, 160); setHasDrawn(false) }
  const save = () => {
    const s = document.createElement('canvas'); s.width = 300; s.height = 100
    const ctx = s.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 300, 100); ctx.drawImage(canvasRef.current, 0, 0, 300, 100)
    let q = 0.5, d = s.toDataURL('image/jpeg', q)
    while (d.length > 13000 && q > 0.1) { q -= 0.05; d = s.toDataURL('image/jpeg', q) }
    onSave(d)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 24, width: '100%', maxWidth: 480 }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginBottom: 4 }}>✍️ {title}</div>
        <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 16 }}>วาดลายเซ็นต์ในกรอบด้านล่าง (สีน้ำเงิน)</div>
        <div style={{ border: '2px solid #d1d5db', borderRadius: 8, overflow: 'hidden', marginBottom: 12, cursor: 'crosshair', touchAction: 'none' }}>
          <canvas ref={canvasRef} width={440} height={160} style={{ display: 'block', width: '100%', height: 160 }}
            onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
            onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw} />
        </div>
        <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 16, textAlign: 'center' }}>compress อัตโนมัติ (ไม่เกิน 10KB)</div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
          <button onClick={clear} style={{ padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: 7, fontSize: 13, background: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>🗑 ล้าง</button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onCancel} style={{ padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: 7, fontSize: 13, background: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>ยกเลิก</button>
            <button onClick={save} disabled={!hasDrawn} style={{ padding: '8px 20px', border: 'none', borderRadius: 7, fontSize: 13, background: hasDrawn ? '#1d4ed8' : '#93c5fd', color: '#fff', cursor: hasDrawn ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>ยืนยัน</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ===== Reopen Dialog =====
function ReopenDialog({ onConfirm, onCancel }) {
  const [text, setText] = useState('')
  const valid = text === 'REOPEN'
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 24, width: '100%', maxWidth: 400 }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#dc2626', marginBottom: 8 }}>⚠️ Reopen Incident</div>
        <div style={{ fontSize: 13, color: '#374151', marginBottom: 16, lineHeight: 1.6 }}>
          การ Reopen จะปลดล็อคเอกสารและลบลายเซ็นต์ออกทั้งหมด<br />
          พิมพ์ <strong style={{ color: '#dc2626', fontFamily: 'monospace' }}>REOPEN</strong> เพื่อยืนยัน
        </div>
        <input value={text} onChange={e => setText(e.target.value)} placeholder="พิมพ์ REOPEN"
          style={{ width: '100%', padding: '10px 12px', border: `1px solid ${valid ? '#10b981' : '#d1d5db'}`, borderRadius: 8, fontSize: 14, fontFamily: 'monospace', marginBottom: 16, outline: 'none', background: valid ? '#f0fdf4' : '#fff' }} />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{ padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: 7, fontSize: 13, background: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>ยกเลิก</button>
          <button onClick={onConfirm} disabled={!valid} style={{ padding: '8px 20px', border: 'none', borderRadius: 7, fontSize: 13, background: valid ? '#dc2626' : '#fca5a5', color: '#fff', cursor: valid ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>Reopen</button>
        </div>
      </div>
    </div>
  )
}

// ===== Resolve Dialog =====
function ResolveDialog({ incident, form, setForm, onConfirm, onCancel }) {
  const [step, setStep] = useState(1)
  const [sigIT, setSigIT] = useState(form.signature_it || null)
  const [sigReporter, setSigReporter] = useState(form.signature_reporter || null)
  const [sigManager, setSigManager] = useState(form.signature_manager || null)
  const [showCanvas, setShowCanvas] = useState(null) // 'IT', 'Reporter', 'Manager'

  const isHigh = incident?.severity === 'High'
  const totalSteps = isHigh ? 5 : 4
  const steps = [
    { n:1, label:'Resolution' },
    { n:2, label:'IT' },
    { n:3, label:'ผู้แจ้ง' },
    ...(isHigh ? [{ n:4, label:'ผู้จัดการ' }] : []),
    { n:totalSteps, label:'ตรวจสอบ' }
  ]

  const handleDraft = () => {
    onConfirm(sigIT, sigReporter, sigManager, true)
  }

  const renderCanvas = () => {
    if (!showCanvas) return null
    let title = ''
    if (showCanvas === 'IT') title = 'ลายเซ็นต์ IT Officer'
    if (showCanvas === 'Reporter') title = 'ลายเซ็นต์ผู้แจ้งรับทราบ'
    if (showCanvas === 'Manager') title = 'ลายเซ็นต์ผู้จัดการรับทราบ'
    return <SignatureCanvas title={title} onSave={d => { 
      if (showCanvas === 'IT') setSigIT(d)
      if (showCanvas === 'Reporter') setSigReporter(d)
      if (showCanvas === 'Manager') setSigManager(d)
      setShowCanvas(null) 
    }} onCancel={() => setShowCanvas(null)} />
  }

  const renderSignatureStep = (title, subtitle, sig, setSig, canvasKey, nextStep, prevStep) => (
    <>
      <div style={{ fontSize:15, fontWeight:600, color:'#111827', marginBottom:8 }}>✍️ {title}</div>
      <div style={{ fontSize:12, color:'#6b7280', marginBottom:16 }}>{subtitle}</div>
      
      {/* Details Preview */}
      <div style={{ background:'#f9fafb', borderRadius:8, padding:12, marginBottom:16, fontSize:12 }}>
        <div style={{ fontWeight:600, marginBottom:4 }}>รายละเอียดเคส:</div>
        <div style={{ color:'#374151', marginBottom:8 }}>{form.resolution}</div>
        <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
          {sigIT && canvasKey !== 'IT' && <div style={{ border:'1px solid #e5e7eb', padding:4, borderRadius:4, background:'#fff' }}><div style={{fontSize:10, color:'#6b7280'}}>IT Officer</div><img src={sigIT} height={30} alt="sig"/></div>}
          {sigReporter && canvasKey === 'Manager' && <div style={{ border:'1px solid #e5e7eb', padding:4, borderRadius:4, background:'#fff' }}><div style={{fontSize:10, color:'#6b7280'}}>ผู้แจ้ง</div><img src={sigReporter} height={30} alt="sig"/></div>}
        </div>
      </div>

      {sig ? (
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:12, color:'#059669', marginBottom:8, fontWeight:500 }}>✅ ลายเซ็นต์บันทึกแล้ว</div>
          <div style={{ border:'1px solid #d1d5db', borderRadius:8, overflow:'hidden', display:'inline-block' }}>
            <img src={sig} alt="sig" style={{ display:'block', height:80 }} />
          </div>
          <button onClick={() => setSig(null)} style={{ display:'block', marginTop:8, fontSize:12, color:'#6b7280', background:'none', border:'none', cursor:'pointer', padding:0 }}>🔄 วาดใหม่</button>
        </div>
      ) : (
        <div onClick={() => setShowCanvas(canvasKey)} style={{ border:'2px dashed #d1d5db', borderRadius:8, padding:24, textAlign:'center', marginBottom:16, cursor:'pointer', background:'#f9fafb' }}>
          <div style={{ fontSize:32, marginBottom:8 }}>✍️</div>
          <div style={{ fontSize:13, color:'#6b7280' }}>กดเพื่อวาดลายเซ็นต์</div>
        </div>
      )}
      <div style={{ display:'flex', gap:8, justifyContent:'space-between' }}>
        <button onClick={() => setStep(prevStep)} style={{ padding:'8px 16px', border:'1px solid #d1d5db', borderRadius:7, fontSize:13, background:'#fff', cursor:'pointer', fontFamily:'inherit' }}>← ย้อนกลับ</button>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={handleDraft} style={{ padding:'8px 16px', border:'1px solid #d1d5db', borderRadius:7, fontSize:13, background:'#f3f4f6', cursor:'pointer', fontFamily:'inherit', color:'#374151' }}>💾 Save Draft</button>
          <button onClick={() => { if(!sig){alert('กรุณาวาดลายเซ็นต์ก่อนครับ');return} setStep(nextStep) }}
            style={{ padding:'8px 20px', border:'none', borderRadius:7, fontSize:13, background:'#1d4ed8', color:'#fff', cursor:'pointer', fontFamily:'inherit' }}>ถัดไป →</button>
        </div>
      </div>
    </>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16, overflowY: 'auto' }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 24, width: '100%', maxWidth: 560, margin: 'auto' }}>
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, overflowX: 'auto', paddingBottom: 8 }}>
          {steps.map((s, i) => (
            <div key={s.n} style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <div style={{ width:24, height:24, borderRadius:'50%', background: step>=s.n?'#1d4ed8':'#e5e7eb', color: step>=s.n?'#fff':'#9ca3af', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:600 }}>{s.n}</div>
              <div style={{ fontSize:11, color: step>=s.n?'#1d4ed8':'#9ca3af', fontWeight: step===s.n?600:400 }}>{s.label}</div>
              {i < steps.length - 1 && <div style={{ width: 16, height:1, background: step>s.n?'#1d4ed8':'#e5e7eb' }} />}
            </div>
          ))}
        </div>

        {renderCanvas()}

        {step === 1 && (
          <>
            <div style={{ fontSize:15, fontWeight:600, color:'#111827', marginBottom:16 }}>✅ ยืนยันการปิด Incident</div>
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:12, fontWeight:500, color:'#374151', display:'block', marginBottom:6 }}>วิธีการแก้ไข / Resolution <span style={{ color:'#dc2626' }}>*</span></label>
              <textarea value={form.resolution||''} onChange={e => setForm({...form, resolution:e.target.value})} rows={4}
                placeholder="อธิบายวิธีการที่ใช้แก้ไขปัญหา..."
                style={{ width:'100%', padding:'9px 12px', border:'1px solid #d1d5db', borderRadius:8, fontSize:13, resize:'vertical', fontFamily:'inherit', lineHeight:1.6 }} />
            </div>
            <div style={{ marginBottom:20 }}>
              <label style={{ fontSize:12, fontWeight:500, color:'#374151', display:'block', marginBottom:6 }}>Root Cause Analysis <span style={{ color:'#dc2626' }}>*</span></label>
              <textarea value={form.root_cause||''} onChange={e => setForm({...form, root_cause:e.target.value})} rows={3}
                placeholder="วิเคราะห์สาเหตุที่แท้จริง..."
                style={{ width:'100%', padding:'9px 12px', border:'1px solid #d1d5db', borderRadius:8, fontSize:13, resize:'vertical', fontFamily:'inherit', lineHeight:1.6 }} />
            </div>
            <div style={{ display:'flex', gap:8, justifyContent:'space-between' }}>
              <button onClick={onCancel} style={{ padding:'8px 16px', border:'1px solid #d1d5db', borderRadius:7, fontSize:13, background:'#fff', cursor:'pointer', fontFamily:'inherit' }}>ยกเลิก</button>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={handleDraft} style={{ padding:'8px 16px', border:'1px solid #d1d5db', borderRadius:7, fontSize:13, background:'#f3f4f6', cursor:'pointer', fontFamily:'inherit', color:'#374151' }}>💾 Save Draft</button>
                <button onClick={() => { if(!form.resolution?.trim() || !form.root_cause?.trim()){alert('กรุณากรอก Resolution และ Root Cause ให้ครบถ้วน');return} setStep(2) }}
                  style={{ padding:'8px 20px', border:'none', borderRadius:7, fontSize:13, background:'#1d4ed8', color:'#fff', cursor:'pointer', fontFamily:'inherit' }}>ถัดไป →</button>
              </div>
            </div>
          </>
        )}

        {step === 2 && renderSignatureStep('ลายเซ็นต์ผู้ปิดเคส', 'วาดลายเซ็นต์เพื่อยืนยันการปิด Incident', sigIT, setSigIT, 'IT', 3, 1)}
        {step === 3 && renderSignatureStep('ลายเซ็นต์ผู้แจ้ง', 'วาดลายเซ็นต์เพื่อรับทราบการปิดเคส', sigReporter, setSigReporter, 'Reporter', isHigh ? 4 : totalSteps, 2)}
        {step === 4 && isHigh && renderSignatureStep('ลายเซ็นต์ผู้จัดการ', 'วาดลายเซ็นต์เพื่อรับทราบสำหรับเคส High Severity', sigManager, setSigManager, 'Manager', totalSteps, 3)}

        {step === totalSteps && (
          <>
            <div style={{ fontSize:15, fontWeight:600, color:'#111827', marginBottom:16 }}>🔍 ตรวจสอบก่อนบันทึก</div>
            <div style={{ background:'#f9fafb', borderRadius:8, padding:16, marginBottom:16, fontSize:13 }}>
              <div style={{ marginBottom:10 }}><div style={{ fontSize:11, color:'#6b7280', marginBottom:2 }}>Resolution</div><div style={{ color:'#111827', lineHeight:1.6 }}>{form.resolution}</div></div>
              <div style={{ marginBottom:10 }}><div style={{ fontSize:11, color:'#6b7280', marginBottom:2 }}>Root Cause</div><div style={{ color:'#111827', lineHeight:1.6 }}>{form.root_cause}</div></div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 10, marginTop: 12 }}>
                <div><div style={{ fontSize:11, color:'#6b7280', marginBottom:6 }}>IT Officer</div>{sigIT ? <img src={sigIT} height={50} style={{border:'1px solid #e5e7eb', background:'#fff', borderRadius:4}} alt="sig"/> : <span style={{color:'#dc2626'}}>รอเซ็นต์</span>}</div>
                <div><div style={{ fontSize:11, color:'#6b7280', marginBottom:6 }}>ผู้แจ้ง</div>{sigReporter ? <img src={sigReporter} height={50} style={{border:'1px solid #e5e7eb', background:'#fff', borderRadius:4}} alt="sig"/> : <span style={{color:'#dc2626'}}>รอเซ็นต์</span>}</div>
                {isHigh && <div><div style={{ fontSize:11, color:'#6b7280', marginBottom:6 }}>ผู้จัดการ</div>{sigManager ? <img src={sigManager} height={50} style={{border:'1px solid #e5e7eb', background:'#fff', borderRadius:4}} alt="sig"/> : <span style={{color:'#dc2626'}}>รอเซ็นต์</span>}</div>}
              </div>
            </div>
            <div style={{ background:'#fffbeb', border:'1px solid #fcd34d', borderRadius:8, padding:'10px 14px', fontSize:12, color:'#92400e', marginBottom:16 }}>
              ⚠️ เมื่อยืนยันแล้ว เอกสารจะถูกล็อคสถานะ Resolved ทันที
            </div>
            <div style={{ display:'flex', gap:8, justifyContent:'space-between' }}>
              <button onClick={() => setStep(isHigh ? 4 : 3)} style={{ padding:'8px 16px', border:'1px solid #d1d5db', borderRadius:7, fontSize:13, background:'#fff', cursor:'pointer', fontFamily:'inherit' }}>← ย้อนกลับ</button>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={handleDraft} style={{ padding:'8px 16px', border:'1px solid #d1d5db', borderRadius:7, fontSize:13, background:'#f3f4f6', cursor:'pointer', fontFamily:'inherit', color:'#374151' }}>💾 Save Draft</button>
                <button onClick={() => onConfirm(sigIT, sigReporter, sigManager, false)}
                  style={{ padding:'8px 20px', border:'none', borderRadius:7, fontSize:13, background:'#059669', color:'#fff', cursor:'pointer', fontFamily:'inherit', fontWeight:600 }}>✅ ยืนยันปิดเคส</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ===== Main Page =====
export default function IncidentDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [incident, setIncident] = useState(null)
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [isSuperUser, setIsSuperUser] = useState(false)
  const [showResolveDialog, setShowResolveDialog] = useState(false)
  const [showReopenDialog, setShowReopenDialog] = useState(false)

  // Master Data
  const [categories, setCategories] = useState([])
  const [systems, setSystems] = useState([])
  const [assignees, setAssignees] = useState([]) // { id, full_name }

  useEffect(() => { initUser(); fetchIncident(); fetchLogs(); loadMasterData() }, [id])

  // Auto status เมื่อ edit แล้วเปลี่ยน assignee
  useEffect(() => {
    if (!editing) return
    if (form.assigned_to && !incident?.assigned_to) {
      setForm(prev => ({ ...prev, status: 'In Progress', assigned_at: new Date().toISOString() }))
    } else if (!form.assigned_to && incident?.assigned_to) {
      setForm(prev => ({ ...prev, status: 'Open', assigned_at: null }))
    }
  }, [form.assigned_to, editing])

  const loadMasterData = async () => {
    const { data: master } = await supabase
      .from('master_data').select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
    setCategories((master||[]).filter(d=>d.type==='incident_category').map(d=>d.value))
    setSystems((master||[]).filter(d=>d.type==='affected_system').map(d=>d.value))

    // ดึง Assignee จาก user_profiles
    const { data: assigneeData } = await supabase
      .from('user_profiles')
      .select('id, full_name')
      .eq('can_be_assignee', true)
      .eq('is_active', true)
      .order('full_name', { ascending: true })
    setAssignees(assigneeData || [])
  }

  const initUser = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    setCurrentUser(session.user)
    const { data: p } = await supabase.from('user_profiles').select('role').eq('id', session.user.id).single()
    setIsSuperUser(p?.role === 'superuser')
  }

  const fetchIncident = async () => {
    const { data } = await supabase.from('incidents').select('*').eq('id', id).single()
    setIncident(data); setForm(data||{}); setLoading(false)
  }

  const fetchLogs = async () => {
    const { data } = await supabase.from('incident_logs').select('*')
      .eq('incident_id', id).order('created_at', { ascending: true })
    setLogs(data||[])
  }

  const addLog = async (action, fromStatus, toStatus, note='') => {
    const { error } = await supabase.from('incident_logs').insert([{
      incident_id: id, action,
      from_status: fromStatus, to_status: toStatus,
      note, user_email: currentUser?.email,
    }])
    if (error) {
      alert(`บันทึก Log ไม่สำเร็จ: ${error.message}`)
      return false
    }
    await fetchLogs()
    return true
  }

  const handleSave = async () => {
    const oldStatus = incident.status
    const newStatus = form.status

    // ถ้ามีการเปลี่ยนสถานะเป็น Resolved ผ่าน dropdown ให้เปิดหน้าต่างเซ็นชื่อแทนการเซฟปกติ
    if (newStatus === 'Resolved' && oldStatus !== 'Resolved') {
      setShowResolveDialog(true)
      return
    }

    setSaving(true)
    const oldAssignee = incident.assigned_to
    const newAssignee = form.assigned_to

    const { error } = await supabase.from('incidents').update(form).eq('id', id)
    if (error) {
      alert(`บันทึกข้อมูลไม่สำเร็จ: ${error.message}`)
      setSaving(false)
      return
    }

    if (oldAssignee !== newAssignee) {
      if (newAssignee && !oldAssignee) {
        await addLog('กำหนดผู้รับผิดชอบ', oldStatus, 'In Progress', `มอบหมายให้: ${newAssignee} · Response Time เริ่มนับแล้ว`)
      } else if (!newAssignee && oldAssignee) {
        await addLog('ยกเลิกผู้รับผิดชอบ', oldStatus, 'Open', `ยกเลิก: ${oldAssignee}`)
      } else {
        await addLog('เปลี่ยนผู้รับผิดชอบ', oldStatus, newStatus, `${oldAssignee} → ${newAssignee}`)
      }
    } else if (oldStatus !== newStatus) {
      await addLog('เปลี่ยนสถานะ', oldStatus, newStatus)
    } else {
      await addLog('แก้ไขข้อมูล', oldStatus, oldStatus, 'อัปเดตรายละเอียด')
    }

    setIncident(form); setEditing(false); setSaving(false)
  }

  const handleResolve = async (sigIT, sigReporter, sigManager, isDraft) => {
    setSaving(true)
    const now = new Date().toISOString()
    
    if (isDraft) {
      const updateData = { 
        ...form,
        status: incident.status, // Revert back to original status if saving draft
        signature_it: sigIT,
        signature_reporter: sigReporter,
        signature_manager: sigManager
      }
      const { error } = await supabase.from('incidents').update(updateData).eq('id', id)
      if (error) {
        alert(`บันทึก Draft ไม่สำเร็จ: ${error.message}`)
      } else {
        await addLog('บันทึก Draft', incident.status, incident.status, 'อัปเดตลายเซ็นต์ / Resolution')
        setIncident(updateData)
        setForm(updateData)
        setShowResolveDialog(false)
        setEditing(false)
      }
      setSaving(false)
      return
    }

    const slaMin = SLA_MINUTES[incident.severity] || SLA_MINUTES['Medium']
    const responseMin = calcMinutes(incident.created_at, incident.assigned_at)
    const resolveMin = calcMinutes(incident.created_at, now)
    const responseOk = responseMin !== null ? responseMin <= slaMin.response : null
    const resolveOk = resolveMin !== null ? resolveMin <= slaMin.resolve : null
    const slaNote = `Response: ${formatElapsed(responseMin)} ${responseOk===true?'✅':responseOk===false?'⏰':'—'} | Resolution: ${formatElapsed(resolveMin)} ${resolveOk===true?'✅':resolveOk===false?'⏰':'—'}`

    const updateData = { 
      ...form, 
      status:'Resolved', 
      is_locked:true, 
      resolved_at:now, 
      resolved_by:currentUser?.email, 
      signature_it:sigIT,
      signature_reporter:sigReporter,
      signature_manager:sigManager
    }
    const { error } = await supabase.from('incidents').update(updateData).eq('id', id)
    if (error) {
      alert(`ปิดเคสไม่สำเร็จ: ${error.message}`)
      setSaving(false)
      return
    }

    await addLog('ปิดเคส (Resolved)', incident.status, 'Resolved', `${slaNote} · ลงนามโดย: ${currentUser?.email}`)

    // Sync back to Checklist if this incident was opened from a checklist item
    if (incident.ref_type === 'checklist' && incident.ref_id) {
      try {
        const { data: item } = await supabase.from('checklist_items').select('doc_id, notes').eq('id', incident.ref_id).single()
        if (item) {
          await supabase.from('checklist_items')
            .update({ status: 'OK', notes: `${item.notes ? item.notes + '\n' : ''}(Fixed via ${incident.case_number})` })
            .eq('id', incident.ref_id)

          if (item.doc_id) {
            await supabase.from('checklist_logs').insert([{
              doc_id: item.doc_id,
              action: `รายการได้รับการแก้ไขและปิดเคสแล้ว (อ้างอิง ${incident.case_number})`,
              user_email: currentUser?.email
            }])
          }
        }
      } catch (syncErr) {
        console.error("Sync to checklist failed:", syncErr)
      }
    }

    setIncident(updateData); setForm(updateData); setEditing(false); setShowResolveDialog(false); setSaving(false)
  }

  const handleReopen = async () => {
    setSaving(true)
    const updateData = { ...incident, status:'Open', is_locked:false, resolved_at:null, resolved_by:null, signature_it:null, signature_reporter:null, signature_manager:null }
    const { error } = await supabase.from('incidents').update(updateData).eq('id', id)
    if (error) {
      alert(`Reopen ไม่สำเร็จ: ${error.message}`)
      setSaving(false)
      return
    }
    await addLog('Reopen', 'Resolved', 'Open', `Reopen โดย: ${currentUser?.email}`)
    setIncident(updateData); setForm(updateData); setShowReopenDialog(false); setSaving(false)
  }

  const handleDelete = async () => {
    if (!confirm('ต้องการลบ Incident นี้ใช่ไหม?')) return
    const { error } = await supabase.from('incidents').delete().eq('id', id)
    if (error) {
      alert(`ลบข้อมูลไม่สำเร็จ: ${error.message}`)
      return
    }
    router.push('/dashboard/incidents')
  }

  const isLocked = incident?.is_locked || incident?.status === 'Resolved'

  // SLA
  const slaMin = SLA_MINUTES[incident?.severity] || SLA_MINUTES['Medium']
  const slaLabel = SLA_LABELS[incident?.severity] || SLA_LABELS['Medium']
  const responseMin = incident?.assigned_at ? calcMinutes(incident.created_at, incident.assigned_at) : calcElapsedNow(incident?.created_at)
  const resolveMin = incident?.resolved_at ? calcMinutes(incident.created_at, incident.resolved_at) : calcElapsedNow(incident?.created_at)

  const responseState = !incident?.assigned_at ? 'waiting'
    : responseMin <= slaMin.response ? 'done_ok' : 'done_late'
  const resolveState = incident?.resolved_at
    ? resolveMin <= slaMin.resolve ? 'done_ok' : 'done_late'
    : resolveMin <= slaMin.resolve ? 'counting' : 'counting_late'

  // Field helper
  const field = (label, key, type='text', options=null) => (
    <div style={{ marginBottom:14 }}>
      <div style={{ fontSize:11, color:'#6b7280', marginBottom:4 }}>{label}</div>
      {editing && !isLocked ? (
        options === 'master_category' ? (
          <select value={form[key]||''} onChange={e => setForm({...form,[key]:e.target.value})}
            style={{ width:'100%', padding:'8px 10px', border:'1px solid #d1d5db', borderRadius:6, fontSize:13, background:'#fff', fontFamily:'inherit' }}>
            <option value="">— เลือกประเภท —</option>
            {categories.map(o => <option key={o}>{o}</option>)}
          </select>
        ) : options === 'master_system' ? (
          <select value={form[key]||''} onChange={e => setForm({...form,[key]:e.target.value})}
            style={{ width:'100%', padding:'8px 10px', border:'1px solid #d1d5db', borderRadius:6, fontSize:13, background:'#fff', fontFamily:'inherit' }}>
            <option value="">— เลือกระบบ —</option>
            {systems.map(o => <option key={o}>{o}</option>)}
          </select>
        ) : Array.isArray(options) ? (
          <select value={form[key]||''} onChange={e => setForm({...form,[key]:e.target.value})}
            style={{ width:'100%', padding:'8px 10px', border:'1px solid #d1d5db', borderRadius:6, fontSize:13, background:'#fff', fontFamily:'inherit' }}>
            {options.map(o => <option key={o}>{o}</option>)}
          </select>
        ) : type==='textarea' ? (
          <textarea value={form[key]||''} onChange={e => setForm({...form,[key]:e.target.value})}
            rows={3} style={{ width:'100%', padding:'8px 10px', border:'1px solid #d1d5db', borderRadius:6, fontSize:13, resize:'vertical', fontFamily:'inherit' }} />
        ) : (
          <input value={form[key]||''} onChange={e => setForm({...form,[key]:e.target.value})}
            style={{ width:'100%', padding:'8px 10px', border:'1px solid #d1d5db', borderRadius:6, fontSize:13, fontFamily:'inherit' }} />
        )
      ) : (
        <div style={{ fontSize:14, color:incident?.[key]?'#111827':'#d1d5db', padding:'6px 0', borderBottom:'1px solid #f3f4f6', minHeight:32, whiteSpace:'pre-wrap' }}>
          {incident?.[key]||'—'}
        </div>
      )}
    </div>
  )

  if (loading) return <div style={{ padding:40, textAlign:'center', color:'#9ca3af' }}>กำลังโหลด...</div>
  if (!incident) return <div style={{ padding:40, textAlign:'center', color:'#9ca3af' }}>ไม่พบข้อมูล</div>

  return (
    <>
      <style>{`@media print{.no-print{display:none!important}.print-only{display:block!important}body{background:white!important;margin:0}}@media screen{.print-only{display:none!important}}`}</style>

      {showResolveDialog && <ResolveDialog incident={incident} form={form} setForm={setForm} onConfirm={handleResolve} onCancel={() => setShowResolveDialog(false)} />}
      {showReopenDialog && <ReopenDialog onConfirm={handleReopen} onCancel={() => setShowReopenDialog(false)} />}

      {/* SCREEN VIEW */}
      <div className="no-print" style={{ padding:24, maxWidth:900, margin:'0 auto' }}>

        {/* Topbar */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, flexWrap:'wrap', gap:10 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <Link href="/dashboard/incidents" style={{ color:'#6b7280', fontSize:13, textDecoration:'none' }}>← กลับ</Link>
            <h1 style={{ fontSize:18, fontWeight:600, color:'#111827', margin:0 }}>รายละเอียด Incident</h1>
            {isLocked && <span style={{ background:'#d1fae5', color:'#065f46', padding:'3px 10px', borderRadius:20, fontSize:12, fontWeight:500 }}>🔒 Resolved</span>}
          </div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            <button onClick={() => window.print()} style={{ padding:'7px 14px', border:'1px solid #d1d5db', borderRadius:7, fontSize:13, background:'#fff', cursor:'pointer', fontFamily:'inherit' }}>🖨 Print FR-IT-01</button>
            {isLocked ? (
              isSuperUser && <button onClick={() => setShowReopenDialog(true)} style={{ padding:'7px 14px', border:'none', borderRadius:7, fontSize:13, background:'#fef3c7', color:'#92400e', cursor:'pointer', fontFamily:'inherit' }}>🔓 Reopen</button>
            ) : !editing ? (
              <>
                <button onClick={() => setEditing(true)} style={{ padding:'7px 14px', border:'1px solid #d1d5db', borderRadius:7, fontSize:13, background:'#fff', cursor:'pointer', fontFamily:'inherit' }}>✏️ แก้ไข</button>
                <button onClick={() => setShowResolveDialog(true)} style={{ padding:'7px 14px', border:'none', borderRadius:7, fontSize:13, background:'#059669', color:'#fff', cursor:'pointer', fontFamily:'inherit' }}>✅ Resolve</button>
                <button onClick={handleDelete} style={{ padding:'7px 14px', border:'none', borderRadius:7, fontSize:13, background:'#fee2e2', color:'#991b1b', cursor:'pointer', fontFamily:'inherit' }}>🗑 ลบ</button>
              </>
            ) : (
              <>
                <button onClick={() => { setEditing(false); setForm(incident) }} style={{ padding:'7px 14px', border:'1px solid #d1d5db', borderRadius:7, fontSize:13, background:'#fff', cursor:'pointer', fontFamily:'inherit' }}>ยกเลิก</button>
                <button onClick={handleSave} disabled={saving} style={{ padding:'7px 16px', border:'none', borderRadius:7, fontSize:13, background:'#1d4ed8', color:'#fff', cursor:'pointer', fontFamily:'inherit' }}>
                  {saving ? 'กำลังบันทึก...' : '💾 บันทึก'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Locked Banner */}
        {isLocked && (
          <div style={{ background:'#d1fae5', border:'1px solid #6ee7b7', borderRadius:10, padding:'12px 16px', marginBottom:16, display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:16 }}>🔒</span>
            <div>
              <div style={{ fontSize:13, fontWeight:600, color:'#065f46' }}>เอกสารปิดแล้ว (Resolved)</div>
              <div style={{ fontSize:12, color:'#059669' }}>ปิดโดย: {incident.resolved_by||'—'} เมื่อ {formatDateTime(incident.resolved_at)}{isSuperUser && ' · Super User สามารถ Reopen ได้'}</div>
            </div>
          </div>
        )}

        {/* Auto-status notice */}
        {editing && form.assigned_to && !incident?.assigned_to && (
          <div style={{ background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:10, padding:'10px 16px', marginBottom:16, fontSize:12, color:'#1e40af' }}>
            ℹ️ กำหนดผู้รับผิดชอบแล้ว → สถานะจะเปลี่ยนเป็น <strong>"In Progress"</strong> และเริ่มนับ Response Time
          </div>
        )}

        {/* Case Header */}
        <div style={{ background:'#fff', borderRadius:10, border:'1px solid #e5e7eb', padding:20, marginBottom:16 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12, flexWrap:'wrap', gap:10 }}>
            <div>
              <div style={{ fontSize:12, color:'#9ca3af', fontFamily:'monospace', marginBottom:4 }}>{incident.case_number}</div>
              <div style={{ fontSize:18, fontWeight:600, color:'#111827' }}>{incident.title}</div>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <span style={{ ...SEVERITY_COLORS[incident.severity], padding:'4px 12px', borderRadius:20, fontSize:12, fontWeight:500 }}>{incident.severity}</span>
              <span style={{ ...STATUS_COLORS[incident.status], padding:'4px 12px', borderRadius:20, fontSize:12 }}>{incident.status}</span>
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))', gap:10, fontSize:12, color:'#6b7280', paddingTop:12, borderTop:'1px solid #f3f4f6' }}>
            <div>วันที่แจ้ง: <span style={{ color:'#374151' }}>{formatDateTime(incident.created_at)}</span></div>
            <div>ผู้แจ้ง: <span style={{ color:'#374151' }}>{incident.reported_by||'—'}</span></div>
            <div>ผู้รับผิดชอบ: <span style={{ color:incident.assigned_to?'#1d4ed8':'#9ca3af', fontWeight:incident.assigned_to?500:400 }}>{incident.assigned_to||'ยังไม่มอบหมาย'}</span></div>
            {incident.assigned_at && <div>เวลา Assign: <span style={{ color:'#374151' }}>{formatDateTime(incident.assigned_at)}</span></div>}
            {incident.resolved_at && <div>วันที่ปิด: <span style={{ color:'#059669', fontWeight:500 }}>{formatDateTime(incident.resolved_at)}</span></div>}
          </div>
        </div>

        {/* Detail Grid */}
        <div className="detail-grid" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
          <div style={{ background:'#fff', borderRadius:10, border:'1px solid #e5e7eb', padding:20 }}>
            <div style={{ fontSize:13, fontWeight:600, color:'#374151', marginBottom:14, paddingBottom:10, borderBottom:'1px solid #f3f4f6' }}>ข้อมูลหลัก</div>
            {field('ระบบที่ได้รับผลกระทบ', 'affected_system', 'select', 'master_system')}
            {field('ประเภท Incident', 'category', 'select', 'master_category')}
            {field('ระดับความรุนแรง', 'severity', 'select', ['High','Medium','Low'])}
            {field('สถานะ', 'status', 'select', ['Open','In Progress','Resolved'])}
            {field('ผู้แจ้ง', 'reported_by')}

            {/* Assignee Dropdown จาก user_profiles */}
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:11, color:'#6b7280', marginBottom:4 }}>
                ผู้รับผิดชอบ / Assigned To
                {editing && !isLocked && <span style={{ fontSize:10, color:'#9ca3af', marginLeft:4 }}>(เลือกเพื่อเริ่มนับ Response Time)</span>}
              </div>
              {editing && !isLocked ? (
                <>
                  <select value={form.assigned_to||''} onChange={e => setForm({...form, assigned_to:e.target.value})}
                    style={{ width:'100%', padding:'8px 10px', border:'1px solid #d1d5db', borderRadius:6, fontSize:13, background:'#fff', fontFamily:'inherit' }}>
                    <option value="">— ยังไม่ได้มอบหมาย —</option>
                    {assignees.map(a => <option key={a.id} value={a.full_name}>{a.full_name}</option>)}
                  </select>
                  {form.assigned_to && !incident.assigned_to && (
                    <div style={{ fontSize:11, color:'#059669', marginTop:4 }}>✅ Response Time จะเริ่มนับทันทีที่บันทึก</div>
                  )}
                  {assignees.length === 0 && (
                    <div style={{ fontSize:11, color:'#d97706', marginTop:4 }}>
                      ⚠ ยังไม่มีรายชื่อ —{' '}
                      <Link href="/dashboard/settings/users" style={{ color:'#1d4ed8' }}>เปิด Assignee ใน Settings → Users</Link>
                    </div>
                  )}
                </>
              ) : (
                <div style={{ fontSize:14, color:incident.assigned_to?'#111827':'#d1d5db', padding:'6px 0', borderBottom:'1px solid #f3f4f6', minHeight:32 }}>
                  {incident.assigned_to||'—'}
                </div>
              )}
            </div>
          </div>

          <div style={{ background:'#fff', borderRadius:10, border:'1px solid #e5e7eb', padding:20 }}>
            <div style={{ fontSize:13, fontWeight:600, color:'#374151', marginBottom:14, paddingBottom:10, borderBottom:'1px solid #f3f4f6' }}>รายละเอียด</div>
            {field('อาการที่พบ / รายละเอียด', 'description', 'textarea')}
            {field('Root Cause Analysis', 'root_cause', 'textarea')}
            {field('วิธีการแก้ไข / Resolution', 'resolution', 'textarea')}
          </div>
        </div>

        {/* SLA */}
        <div style={{ background:'#fff', borderRadius:10, border:'1px solid #e5e7eb', padding:20, marginBottom:16 }}>
          <div style={{ fontSize:13, fontWeight:600, color:'#374151', marginBottom:16, paddingBottom:10, borderBottom:'1px solid #f3f4f6' }}>⏱ SLA — {incident.severity}</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            <SLAWidget label="Response Time" slaLabel={slaLabel.response} state={responseState} actual={responseMin} />
            <SLAWidget label="Resolution Time" slaLabel={slaLabel.resolve} state={resolveState} actual={resolveMin} />
          </div>
          <div style={{ marginTop:12, paddingTop:12, borderTop:'1px solid #f3f4f6', fontSize:11, color:'#9ca3af', display:'flex', gap:16, flexWrap:'wrap' }}>
            <span>สร้าง: {formatDateTime(incident.created_at)}</span>
            {incident.assigned_at && <span>Assign: {formatDateTime(incident.assigned_at)}</span>}
            {incident.resolved_at && <span>ปิด: {formatDateTime(incident.resolved_at)}</span>}
          </div>
        </div>

        {/* Signature Section */}
        {(incident.signature_it || incident.signature_reporter || incident.signature_manager) && (
          <div style={{ background:'#fff', borderRadius:10, border:'1px solid #e5e7eb', padding:20, marginBottom:16 }}>
            <div style={{ fontSize:13, fontWeight:600, color:'#374151', marginBottom:14, paddingBottom:10, borderBottom:'1px solid #f3f4f6' }}>✍️ ลายเซ็นต์ดิจิตัล</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:16 }}>
              {incident.signature_it && (
                <div>
                  <div style={{ fontSize:11, color:'#6b7280', marginBottom:8 }}>IT Officer</div>
                  <div style={{ border:'1px solid #e5e7eb', borderRadius:8, overflow:'hidden', background:'#fafafa', display:'inline-block' }}>
                    <img src={incident.signature_it} alt="sig" style={{ display:'block', height:80, maxWidth:280 }} />
                  </div>
                  <div style={{ fontSize:11, color:'#9ca3af', marginTop:6 }}>{incident.resolved_by} · {formatDateTime(incident.resolved_at)}</div>
                </div>
              )}
              {incident.signature_reporter && (
                <div>
                  <div style={{ fontSize:11, color:'#6b7280', marginBottom:8 }}>ผู้แจ้ง</div>
                  <div style={{ border:'1px solid #e5e7eb', borderRadius:8, overflow:'hidden', background:'#fafafa', display:'inline-block' }}>
                    <img src={incident.signature_reporter} alt="sig" style={{ display:'block', height:80, maxWidth:280 }} />
                  </div>
                </div>
              )}
              {incident.signature_manager && incident.severity === 'High' && (
                <div>
                  <div style={{ fontSize:11, color:'#6b7280', marginBottom:8 }}>ผู้จัดการรับทราบ</div>
                  <div style={{ border:'1px solid #e5e7eb', borderRadius:8, overflow:'hidden', background:'#fafafa', display:'inline-block' }}>
                    <img src={incident.signature_manager} alt="sig" style={{ display:'block', height:80, maxWidth:280 }} />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Transaction Log */}
        <div style={{ background:'#fff', borderRadius:10, border:'1px solid #e5e7eb', padding:20 }}>
          <div style={{ fontSize:13, fontWeight:600, color:'#374151', marginBottom:16, paddingBottom:10, borderBottom:'1px solid #f3f4f6' }}>📋 Transaction Log</div>
          {logs.length === 0 ? (
            <div style={{ color:'#9ca3af', fontSize:13, textAlign:'center', padding:'16px 0' }}>ยังไม่มี Log</div>
          ) : logs.map((log, i) => (
            <div key={log.id} style={{ display:'flex', gap:12, marginBottom: i<logs.length-1?16:0 }}>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', flexShrink:0 }}>
                <div style={{ width:32, height:32, borderRadius:'50%', background: log.action.includes('ปิดเคส')?'#d1fae5':log.action.includes('Reopen')?'#fef3c7':log.action.includes('กำหนด')?'#eff6ff':'#f3f4f6', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>
                  {log.action.includes('ปิดเคส')?'✅':log.action.includes('Reopen')?'🔓':log.action.includes('กำหนด')?'👤':log.action.includes('สถานะ')?'🔄':'📝'}
                </div>
                {i<logs.length-1 && <div style={{ width:1, flex:1, background:'#e5e7eb', marginTop:4 }} />}
              </div>
              <div style={{ flex:1, paddingBottom: i<logs.length-1?8:0 }}>
                <div style={{ display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:4 }}>
                  <div style={{ fontSize:13, fontWeight:500, color:'#111827' }}>{log.action}</div>
                  <div style={{ fontSize:11, color:'#9ca3af', whiteSpace:'nowrap' }}>{formatDateTime(log.created_at)}</div>
                </div>
                {log.from_status && log.to_status && log.from_status!==log.to_status && (
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:4 }}>
                    <span style={{ ...STATUS_COLORS[log.from_status], padding:'1px 8px', borderRadius:20, fontSize:11 }}>{log.from_status}</span>
                    <span style={{ color:'#9ca3af', fontSize:12 }}>→</span>
                    <span style={{ ...STATUS_COLORS[log.to_status], padding:'1px 8px', borderRadius:20, fontSize:11 }}>{log.to_status}</span>
                  </div>
                )}
                {log.note && <div style={{ fontSize:12, color:'#6b7280', marginTop:4 }}>{log.note}</div>}
                {log.user_email && <div style={{ fontSize:11, color:'#9ca3af', marginTop:2 }}>โดย: {log.user_email}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* PRINT VIEW */}
      <div className="print-only" style={{ padding:'20mm 15mm', fontFamily:'Noto Sans Thai, sans-serif' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16, borderBottom:'2px solid #000', paddingBottom:12 }}>
          <div><div style={{ fontSize:20, fontWeight:700 }}>DOWA</div><div style={{ fontSize:10, color:'#666' }}>บริษัท ดาว่า ไทยแลนด์ จำกัด</div></div>
          <div style={{ textAlign:'center', flex:1 }}><div style={{ fontSize:16, fontWeight:700 }}>บันทึก IT Incident</div><div style={{ fontSize:12, color:'#444' }}>IT Incident Log Form</div></div>
          <div style={{ textAlign:'right', fontSize:11 }}><div>เอกสารเลขที่: <strong>FR-IT-01</strong></div><div>Rev: 00</div></div>
        </div>

        <table style={{ width:'100%', borderCollapse:'collapse', marginBottom:10 }}>
          <tbody>
            <tr>
              <td style={{ border:'1px solid #000', padding:'5px 8px', background:'#f5f5f5', fontWeight:600, fontSize:11, width:130 }}>Case Number</td>
              <td style={{ border:'1px solid #000', padding:'5px 8px', fontSize:12 }}>{incident.case_number}</td>
              <td style={{ border:'1px solid #000', padding:'5px 8px', background:'#f5f5f5', fontWeight:600, fontSize:11, width:130 }}>วันที่แจ้ง</td>
              <td style={{ border:'1px solid #000', padding:'5px 8px', fontSize:12 }}>{formatDateTime(incident.created_at)}</td>
            </tr>
            <tr>
              <td style={{ border:'1px solid #000', padding:'5px 8px', background:'#f5f5f5', fontWeight:600, fontSize:11 }}>ผู้แจ้ง</td>
              <td style={{ border:'1px solid #000', padding:'5px 8px', fontSize:12 }}>{incident.reported_by||'—'}</td>
              <td style={{ border:'1px solid #000', padding:'5px 8px', background:'#f5f5f5', fontWeight:600, fontSize:11 }}>ผู้รับผิดชอบ</td>
              <td style={{ border:'1px solid #000', padding:'5px 8px', fontSize:12 }}>{incident.assigned_to||'—'}</td>
            </tr>
            <tr>
              <td style={{ border:'1px solid #000', padding:'5px 8px', background:'#f5f5f5', fontWeight:600, fontSize:11 }}>ระบบที่เกิดเหตุ</td>
              <td style={{ border:'1px solid #000', padding:'5px 8px', fontSize:12 }}>{incident.affected_system||'—'}</td>
              <td style={{ border:'1px solid #000', padding:'5px 8px', background:'#f5f5f5', fontWeight:600, fontSize:11 }}>ประเภท</td>
              <td style={{ border:'1px solid #000', padding:'5px 8px', fontSize:12 }}>{incident.category||'—'}</td>
            </tr>
            <tr>
              <td style={{ border:'1px solid #000', padding:'5px 8px', background:'#f5f5f5', fontWeight:600, fontSize:11 }}>ระดับความรุนแรง</td>
              <td style={{ border:'1px solid #000', padding:'5px 8px', fontSize:11 }}>
                <strong>{incident.severity}</strong> | Response SLA: {slaLabel.response} | Actual: {formatElapsed(responseMin)} {responseState==='done_ok'?'✅':'⏰'}
              </td>
              <td style={{ border:'1px solid #000', padding:'5px 8px', background:'#f5f5f5', fontWeight:600, fontSize:11 }}>สถานะ</td>
              <td style={{ border:'1px solid #000', padding:'5px 8px', fontSize:12 }}><strong>{incident.status}</strong></td>
            </tr>
            {incident.resolved_at && (
              <tr>
                <td style={{ border:'1px solid #000', padding:'5px 8px', background:'#f5f5f5', fontWeight:600, fontSize:11 }}>Resolution SLA</td>
                <td colSpan={3} style={{ border:'1px solid #000', padding:'5px 8px', fontSize:11 }}>
                  เป้าหมาย: {slaLabel.resolve} | Actual: {formatElapsed(resolveMin)} {resolveState==='done_ok'?'✅ (ใน SLA)':'⏰ (เกิน SLA)'}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {[
          { label:'หัวข้อ', value:incident.title, height:30 },
          { label:'รายละเอียด / Description', value:incident.description, height:50 },
          { label:'Root Cause Analysis', value:incident.root_cause, height:50 },
          { label:'วิธีการแก้ไข / Resolution', value:incident.resolution, height:50 },
        ].map((item,i) => (
          <div key={i} style={{ border:'1px solid #000', borderTop:i===0?'1px solid #000':'none' }}>
            <div style={{ background:'#f0f0f0', padding:'4px 8px', fontWeight:700, fontSize:11, borderBottom:'1px solid #000' }}>{item.label}</div>
            <div style={{ padding:'6px 10px', fontSize:12, minHeight:item.height, whiteSpace:'pre-wrap' }}>{item.value||'—'}</div>
          </div>
        ))}

        <div style={{ border:'1px solid #000', borderTop:'none' }}>
          <div style={{ background:'#f0f0f0', padding:'4px 8px', fontWeight:700, fontSize:11, borderBottom:'1px solid #000' }}>Transaction Log</div>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:'#f9f9f9' }}>
                {['วันที่/เวลา','การดำเนินการ','สถานะ','โดย','หมายเหตุ'].map(h => (
                  <th key={h} style={{ border:'1px solid #ddd', padding:'3px 6px', fontSize:10, fontWeight:600, textAlign:'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id}>
                  <td style={{ border:'1px solid #ddd', padding:'3px 6px', fontSize:10, whiteSpace:'nowrap' }}>{formatDateTime(log.created_at)}</td>
                  <td style={{ border:'1px solid #ddd', padding:'3px 6px', fontSize:10 }}>{log.action}</td>
                  <td style={{ border:'1px solid #ddd', padding:'3px 6px', fontSize:10, whiteSpace:'nowrap' }}>{log.from_status!==log.to_status?`${log.from_status} → ${log.to_status}`:log.to_status}</td>
                  <td style={{ border:'1px solid #ddd', padding:'3px 6px', fontSize:10 }}>{log.user_email}</td>
                  <td style={{ border:'1px solid #ddd', padding:'3px 6px', fontSize:10 }}>{log.note||''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <table style={{ width:'100%', borderCollapse:'collapse', marginTop:10 }}>
          <tbody>
            <tr>
              <td style={{ border:'1px solid #000', padding:'5px 8px', background:'#f5f5f5', fontWeight:600, fontSize:11, width:130 }}>วันที่/เวลาแจ้ง</td>
              <td style={{ border:'1px solid #000', padding:'5px 8px', fontSize:12 }}>{formatDateTime(incident.created_at)}</td>
              <td style={{ border:'1px solid #000', padding:'5px 8px', background:'#f5f5f5', fontWeight:600, fontSize:11, width:130 }}>วันที่/เวลาปิด</td>
              <td style={{ border:'1px solid #000', padding:'5px 8px', fontSize:12 }}>{formatDateTime(incident.resolved_at)}</td>
            </tr>
          </tbody>
        </table>

        <table style={{ width:'100%', borderCollapse:'collapse', marginTop:10 }}>
          <tbody>
            <tr>
              <td style={{ border:'1px solid #000', padding:'8px', width:'50%', verticalAlign:'top' }}>
                <div style={{ fontSize:11, color:'#666', marginBottom:6 }}>ลายเซ็นต์ IT Officer</div>
                {incident.signature_it ? (
                  <>
                    <img src={incident.signature_it} alt="sig" style={{ height:60, display:'block' }} />
                    <div style={{ fontSize:10, color:'#666', marginTop:4 }}>{incident.resolved_by}</div>
                    <div style={{ fontSize:10, color:'#666' }}>{formatDateTime(incident.resolved_at)}</div>
                  </>
                ) : (
                  <>
                    <div style={{ minHeight:50 }}></div>
                    <div style={{ fontSize:11, borderTop:'1px dotted #999', paddingTop:4, marginTop:8 }}>ชื่อ: .................................................. วันที่: ....................</div>
                  </>
                )}
              </td>
              <td style={{ border:'1px solid #000', padding:'8px', width:'50%', verticalAlign:'top' }}>
                <div style={{ fontSize:11, color:'#666', marginBottom:6 }}>ผู้จัดการรับทราบ / Senior Manager (High only)</div>
                <div style={{ minHeight:50 }}></div>
                <div style={{ fontSize:11, borderTop:'1px dotted #999', paddingTop:4, marginTop:8 }}>ชื่อ: .................................................. วันที่: ....................</div>
              </td>
            </tr>
          </tbody>
        </table>

        <div style={{ marginTop:10, textAlign:'right', fontSize:10, color:'#999' }}>
          พิมพ์เมื่อ: {formatDateTime(new Date().toISOString())} | DOWA IT System | FR-IT-01 Rev.00
        </div>
      </div>
    </>
  )
}