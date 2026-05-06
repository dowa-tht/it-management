'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import { formatDate, formatDateTime } from '@/lib/dateFormat'
import { calculateNetBusinessMinutes, SLA_LIMITS } from '@/lib/slaUtils'
import { SignatureModal } from '../../checklist/components/SignatureModal'
import { isSubstituteOf } from '@/lib/workflow'
import Link from 'next/link'

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
function ResolveDialog({ incident, form, setForm, onConfirm, onCancel, isAutoApprove }) {
  const [step, setStep] = useState(1)
  const [sigIT, setSigIT] = useState(form.signature_it || null)
  const [sigReporter, setSigReporter] = useState(form.signature_reporter || null)
  const [sigManager, setSigManager] = useState(form.signature_manager || null)
  const [showCanvas, setShowCanvas] = useState(null) // 'IT', 'Reporter', 'Manager'

  const isHigh = incident?.severity === 'High'
  const requireCA = form.require_ca || isHigh
  const steps = [
    { n:1, label:'Resolution' },
    ...(requireCA ? [{ n:2, label:'Corrective Action' }] : []),
    { n:requireCA ? 3 : 2, label:'IT' },
    { n:requireCA ? 4 : 3, label:'ผู้แจ้ง' },
    ...(isHigh ? [{ n:requireCA ? 5 : 4, label:'ผู้จัดการ' }] : []),
    { n: (requireCA ? 4 : 3) + (isHigh ? 2 : 1), label:'ตรวจสอบ' }
  ]
  const totalSteps = steps[steps.length - 1].n

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
                <button onClick={() => { 
                  if(!form.resolution?.trim() || !form.root_cause?.trim()){
                    alert('กรุณากรอก Resolution และ Root Cause ให้ครบถ้วน');
                    return;
                  } 
                  setStep(2)
                }}
                  style={{ padding:'8px 20px', border:'none', borderRadius:7, fontSize:13, background:'#1d4ed8', color:'#fff', cursor:'pointer', fontFamily:'inherit' }}>ถัดไป →</button>
              </div>
            </div>
          </>
        )}

        {step === 2 && requireCA && (
          <>
            <div style={{ fontSize:15, fontWeight:600, color:'#111827', marginBottom:16 }}>🛠️ Corrective Action (มาตรการแก้ไข)</div>
            <div style={{ marginBottom:20 }}>
              <label style={{ fontSize:12, fontWeight:500, color:'#374151', display:'block', marginBottom:6 }}>รายละเอียด Corrective Action <span style={{ color:'#dc2626' }}>*</span></label>
              <textarea value={form.corrective_action||''} onChange={e => setForm({...form, corrective_action:e.target.value})} rows={5}
                placeholder="อธิบายมาตรการเพื่อป้องกันการเกิดซ้ำ..."
                style={{ width:'100%', padding:'9px 12px', border:'1px solid #d1d5db', borderRadius:8, fontSize:13, resize:'vertical', fontFamily:'inherit', lineHeight:1.6 }} />
              <div style={{ fontSize:11, color:'#6b7280', marginTop:6 }}>* บังคับสำหรับเคส High Severity หรือมีการระบุว่าต้องการ Corrective Action</div>
            </div>
            <div style={{ display:'flex', gap:8, justifyContent:'space-between' }}>
              <button onClick={() => setStep(1)} style={{ padding:'8px 16px', border:'1px solid #d1d5db', borderRadius:7, fontSize:13, background:'#fff', cursor:'pointer', fontFamily:'inherit' }}>← ย้อนกลับ</button>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={handleDraft} style={{ padding:'8px 16px', border:'1px solid #d1d5db', borderRadius:7, fontSize:13, background:'#f3f4f6', cursor:'pointer', fontFamily:'inherit', color:'#374151' }}>💾 Save Draft</button>
                <button onClick={() => { 
                  if(!form.corrective_action?.trim()){
                    alert('กรุณากรอกรายละเอียด Corrective Action');
                    return;
                  }
                  setStep(3)
                }}
                  style={{ padding:'8px 20px', border:'none', borderRadius:7, fontSize:13, background:'#1d4ed8', color:'#fff', cursor:'pointer', fontFamily:'inherit' }}>ถัดไป →</button>
              </div>
            </div>
          </>
        )}

        {step === (requireCA ? 3 : 2) && renderSignatureStep('ลายเซ็นต์ผู้ปิดเคส', 'วาดลายเซ็นต์เพื่อยืนยันการปิด Incident', sigIT, setSigIT, 'IT', requireCA ? 4 : 3, requireCA ? 2 : 1)}
        {step === (requireCA ? 4 : 3) && renderSignatureStep('ลายเซ็นต์ผู้แจ้ง', 'วาดลายเซ็นต์เพื่อรับทราบการปิดเคส', sigReporter, setSigReporter, 'Reporter', isHigh ? (requireCA ? 5 : 4) : totalSteps, requireCA ? 3 : 2)}
        {step === (requireCA ? 5 : 4) && isHigh && renderSignatureStep('ลายเซ็นต์ผู้จัดการ', 'วาดลายเซ็นต์เพื่อรับทราบสำหรับเคส High Severity', sigManager, setSigManager, 'Manager', totalSteps, requireCA ? 4 : 3)}

        {step === totalSteps && (
          <>
            <div style={{ fontSize:15, fontWeight:600, color:'#111827', marginBottom:16 }}>🔍 ตรวจสอบก่อนบันทึก</div>
            <div style={{ background:'#f9fafb', borderRadius:8, padding:16, marginBottom:16, fontSize:13 }}>
              <div style={{ marginBottom:10 }}><div style={{ fontSize:11, color:'#6b7280', marginBottom:2 }}>Resolution</div><div style={{ color:'#111827', lineHeight:1.6 }}>{form.resolution}</div></div>
              <div style={{ marginBottom:10 }}><div style={{ fontSize:11, color:'#6b7280', marginBottom:2 }}>Root Cause</div><div style={{ color:'#111827', lineHeight:1.6 }}>{form.root_cause}</div></div>
              {requireCA && <div style={{ marginBottom:10 }}><div style={{ fontSize:11, color:'#6b7280', marginBottom:2 }}>Corrective Action</div><div style={{ color:'#1d4ed8', lineHeight:1.6, fontWeight:500 }}>{form.corrective_action}</div></div>}
              
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
              <button onClick={() => setStep(isHigh ? (requireCA ? 5 : 4) : (requireCA ? 4 : 3))} style={{ padding:'8px 16px', border:'1px solid #d1d5db', borderRadius:7, fontSize:13, background:'#fff', cursor:'pointer', fontFamily:'inherit' }}>← ย้อนกลับ</button>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={handleDraft} style={{ padding:'8px 16px', border:'1px solid #d1d5db', borderRadius:7, fontSize:13, background:'#f3f4f6', cursor:'pointer', fontFamily:'inherit', color:'#374151' }}>💾 Save Draft</button>
                <button onClick={() => onConfirm(sigIT, sigReporter, sigManager, false)}
                  style={{ padding:'8px 20px', border:'none', borderRadius:7, fontSize:13, background:'#059669', color:'#fff', cursor:'pointer', fontFamily:'inherit', fontWeight:600 }}>
                  {incident.severity === 'High' && !isAutoApprove ? '🚀 ส่งขออนุมัติงาน' : '🚀 ส่งบันทึกและปิดงาน'}
                </button>
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
  const [exclusions, setExclusions] = useState([])
  const [workingHours, setWorkingHours] = useState(null)
  const [holidays, setHolidays] = useState([])
  const [exclusionReasons, setExclusionReasons] = useState([])
  const [addingExclusion, setAddingExclusion] = useState(false)
  const [newExclusion, setNewExclusion] = useState({ reason_id: '', start_time: '', end_time: '', notes: '' })
  const [showSignatureModal, setShowSignatureModal] = useState(false)
  const [approvalLoading, setApprovalLoading] = useState(false)
  const [isSub, setIsSub] = useState(false)
  const [isAutoApprove, setIsAutoApprove] = useState(false)

  // Master Data
  const [categories, setCategories] = useState([])
  const [systems, setSystems] = useState([])
  const [assignees, setAssignees] = useState([]) // { id, full_name }

  useEffect(() => { 
    initUser()
    fetchIncident()
    fetchLogs()
    loadMasterData()
    fetchExclusions()
    fetchSettings()
  }, [id])

  // Auto status เมื่อ edit แล้วเปลี่ยน assignee
  useEffect(() => {
    if (!editing) return
    if (form.assigned_to && !incident?.assigned_to) {
      setForm(prev => ({ ...prev, status: 'In Progress', assigned_at: new Date().toISOString() }))
    } else if (!form.assigned_to && incident?.assigned_to) {
      setForm(prev => ({ ...prev, status: 'Open', assigned_at: null }))
    }
  }, [form.assigned_to, editing])

  // Auto-check require_ca if High Severity
  useEffect(() => {
    if (form.severity === 'High' && !form.require_ca) {
      setForm(prev => ({ ...prev, require_ca: true }))
    }
  }, [form.severity])

  const loadMasterData = async () => {
    const { data: master } = await supabase
      .from('master_data').select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
    setCategories((master||[]).filter(d=>d.type==='incident_category').map(d=>d.value))
    setSystems((master||[]).filter(d=>d.type==='affected_system').map(d=>d.value))
    setExclusionReasons((master||[]).filter(d=>d.type==='sla_exclusion_reason'))

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
    const { data: p } = await supabase.from('user_profiles').select('role, full_name').eq('id', session.user.id).single()
    if (p) {
      setCurrentUser(prev => ({ ...prev, full_name: p.full_name, role_name: p.role }))
      setIsSuperUser(p.role === 'superuser')
    }
  }

  const isVisitor = currentUser?.role === 'visitor'

  const fetchIncident = async () => {
    const { data } = await supabase.from('incidents').select('*').eq('id', id).single()
    if (data) {
      setIncident(data)
      setForm(data)
      if (currentUser?.id && data.assigned_approver_id) {
        const subCheck = await isSubstituteOf(currentUser.id, data.assigned_approver_id)
        setIsSub(subCheck)
      }
    }
    const { data: config } = await supabase
      .from('approval_configs')
      .select('primary_approver_id')
      .eq('target_type', 'incident')
      .eq('freq_type', 'Incident')
      .single()
    
    // For incident, auto-approve if NOT high severity OR no approver set
    const isHigh = data.severity === 'High'
    setIsAutoApprove(!isHigh || !config?.primary_approver_id)

    setLoading(false)
  }

  const fetchLogs = async () => {
    const { data } = await supabase.from('incident_logs').select('*')
      .eq('incident_id', id).order('created_at', { ascending: true })
    setLogs(data||[])
  }

  const fetchExclusions = async () => {
    const { data } = await supabase.from('incident_exclusions')
      .select('*, reason:master_data(value)')
      .eq('incident_id', id)
      .order('start_time', { ascending: true })
    setExclusions(data || [])
  }

  const fetchSettings = async () => {
    // Fetch Working Hours
    const { data: wh } = await supabase.from('system_settings').select('value').eq('key', 'working_hours').single()
    if (wh) setWorkingHours(wh.value)

    // Fetch Holidays
    const { data: hl } = await supabase.from('holidays').select('holiday_date')
    if (hl) setHolidays(hl.map(h => h.holiday_date))
  }

  const handleAddExclusion = async () => {
    if (!newExclusion.reason_id || !newExclusion.start_time) {
      alert('กรุณาระบุสาเหตุและเวลาเริ่ม')
      return
    }
    const { error } = await supabase.from('incident_exclusions').insert([{
      ...newExclusion,
      incident_id: id,
      created_by: currentUser?.email
    }])
    if (error) alert(error.message)
    else {
      setNewExclusion({ reason_id: '', start_time: '', end_time: '', notes: '' })
      setAddingExclusion(false)
      fetchExclusions()
      addLog('เพิ่ม SLA Exclusion', incident.status, incident.status, 'บันทึกเวลาพัก SLA แบบกำหนดเอง')
    }
  }

  const handleDeleteExclusion = async (exId) => {
    if (!confirm('ต้องการลบรายการพักเวลานี้ใช่ไหม?')) return
    await supabase.from('incident_exclusions').delete().eq('id', exId)
    fetchExclusions()
    addLog('ลบ SLA Exclusion', incident.status, incident.status, 'ยกเลิกการพักเวลา SLA')
  }

  const handlePauseSLA = async (reasonId) => {
    const { error } = await supabase.from('incident_exclusions').insert([{
      incident_id: id,
      reason_id: reasonId,
      start_time: new Date().toISOString(),
      created_by: currentUser?.email
    }])
    if (error) alert(error.message)
    else {
      fetchExclusions()
      addLog('เริ่มพักเวลา SLA', incident.status, incident.status, 'กดปุ่ม Pause SLA')
    }
  }

  const handleResumeSLA = async () => {
    const active = exclusions.find(e => !e.end_time)
    if (!active) return
    const { error } = await supabase.from('incident_exclusions')
      .update({ end_time: new Date().toISOString() })
      .eq('id', active.id)
    if (error) alert(error.message)
    else {
      fetchExclusions()
      addLog('เริ่มนับเวลา SLA ต่อ', incident.status, incident.status, 'กดปุ่ม Resume SLA')
    }
  }

  const handleAcknowledge = async () => {
    if (!currentUser) return
    setSaving(true)
    const now = new Date().toISOString()
    
    const { error } = await supabase.from('incidents')
      .update({ 
        acknowledged_at: now,
        assigned_at: now, // Set assigned_at to stop Response SLA correctly
        status: 'In Progress',
        assigned_to: currentUser.full_name || currentUser?.email?.split('@')[0]
      })
      .eq('id', id)

    if (error) {
      alert(`ไม่สามารถรับเรื่องได้: ${error.message}`)
      setSaving(false)
      return
    }

    await addLog('รับเรื่อง (Acknowledge)', incident.status, 'In Progress', `IT (${currentUser.full_name || currentUser.email}) กดรับทราบเคสและเริ่มดำเนินการ`)
    await fetchIncident()
    setSaving(false)
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
    const now = new Date().toISOString()

    // Create a copy of form to ensure we don't miss fields
    let updatedForm = { ...form }

    // Hard check: If assignee is set but assigned_at is missing, set it now
    if (newAssignee && !updatedForm.assigned_at) {
      updatedForm.assigned_at = now
      updatedForm.status = updatedForm.status === 'Open' ? 'In Progress' : updatedForm.status
    }

    const { error } = await supabase.from('incidents').update(updatedForm).eq('id', id)
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

    setIncident(updatedForm); setEditing(false); setSaving(false)
  }

  const handleResolve = async (sigIT, sigReporter, sigManager, isDraft) => {
    setSaving(true)
    const now = new Date().toISOString()
    
    const isHigh = incident.severity === 'High'
    
    // Check if we need approval for High cases
    const { data: config } = await supabase
      .from('approval_configs')
      .select('primary_approver_id')
      .eq('target_type', 'incident')
      .eq('freq_type', 'Incident')
      .single()

    const needsApproval = isHigh && config?.primary_approver_id

    if (needsApproval && !isDraft) {
      // Instead of closing, submit for approval
      const updateData = { 
        ...form, 
        workflow_status: 'pending',
        assigned_approver_id: config.primary_approver_id,
        signature_it: sigIT,
        signature_reporter: sigReporter,
        // Manager signature remains null until approved
      }
      const { error } = await supabase.from('incidents').update(updateData).eq('id', id)
      if (error) {
        alert(`ส่งขออนุมัติไม่สำเร็จ: ${error.message}`)
      } else {
        await addLog('ส่งขออนุมัติ (Pending Approval)', incident.status, incident.status, `รอการอนุมัติโดย: ${config.primary_approver_id}`)
        setIncident(updateData)
        setShowResolveDialog(false)
      }
      setSaving(false)
      return
    }

    if (isDraft) {
      const updateData = { 
        ...form,
        status: incident.status, // Revert back to original status if saving draft
        signature_it: sigIT,
        signature_reporter: sigReporter,
        signature_manager: sigManager,
        corrective_action: form.corrective_action,
        require_ca: form.require_ca
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

    const slaLimit = SLA_LIMITS[incident?.severity] || SLA_LIMITS.Medium
    const responseLimit = SLA_MINUTES[incident?.severity]?.response || 60
    
    // SLA Calculation (Business Hours)
    const defaultWH = { start: '08:30', end: '17:30', work_days: [1, 2, 3, 4, 5] }
    const wh = workingHours || defaultWH
    const respTime = incident?.acknowledged_at || incident?.assigned_at
    const responseMin = respTime 
      ? calculateNetBusinessMinutes(incident.created_at, respTime, wh, holidays, []) 
      : calculateNetBusinessMinutes(incident.created_at, new Date(), wh, holidays, [])
    const resolveMin = calculateNetBusinessMinutes(incident.created_at, now, wh, holidays, exclusions)
    
    const responseOk = responseMin <= responseLimit
    const resolveOk = resolveMin <= slaLimit
    const slaNote = `Response: ${formatElapsed(responseMin)} ${responseOk?'✅':'⏰'} | Resolution: ${formatElapsed(resolveMin)} ${resolveOk?'✅':'⏰'}`

    const updateData = { 
      ...form, 
      status:'Resolved', 
      is_locked:true, 
      resolved_at:now, 
      resolved_by:currentUser?.email, 
      signature_it:sigIT,
      signature_reporter:sigReporter,
      signature_manager:sigManager,
      corrective_action: form.corrective_action,
      require_ca: form.require_ca
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

  const handleApproveIncident = async (pin, signatureData) => {
    setApprovalLoading(true)
    try {
      // 1. Verify PIN
      const verifyRes = await fetch('/api/auth/verify-pin', {
        method: 'POST',
        body: JSON.stringify({ userId: currentUser.id, pin })
      }).then(r => r.json())

      if (!verifyRes.success) {
        alert(verifyRes.error)
        setApprovalLoading(false)
        return
      }

      // 2. Resolve Incident
      const now = new Date().toISOString()
      const updateData = {
        status: 'Resolved',
        workflow_status: 'approved',
        is_locked: true,
        resolved_at: now,
        resolved_by: incident.resolved_by || currentUser?.email,
        signature_manager: signatureData // Store the PIN-confirmed signature
      }

      const { error } = await supabase.from('incidents').update(updateData).eq('id', id)
      if (error) throw error

      await addLog('อนุมัติปิดเคส (Approved)', incident.status, 'Resolved', `อนุมัติโดย: ${currentUser?.full_name}`)
      setShowSignatureModal(false)
      fetchIncident()
    } catch (err) {
      alert(`การอนุมัติล้มเหลว: ${err.message}`)
    }
    setApprovalLoading(false)
  }

  const handleRejectIncident = async () => {
    const reason = prompt('กรุณาระบุเหตุผลที่ตีกลับ:')
    if (reason === null) return

    const { error } = await supabase.from('incidents').update({
      workflow_status: 'draft',
      assigned_approver_id: null
    }).eq('id', id)

    if (!error) {
      await addLog('ตีกลับการปิดเคส (Rejected)', incident.status, incident.status, `เหตุผล: ${reason}`)
      fetchIncident()
    }
  }

  const handleReopen = async () => {
    setSaving(true)
    const updateData = { 
      ...incident, 
      status:'Open', 
      is_locked:false, 
      resolved_at:null, 
      resolved_by:null, 
      signature_it:null, 
      signature_reporter:null, 
      signature_manager:null,
      workflow_status: null,
      assigned_approver_id: null,
      corrective_action: null,
      require_ca: incident.severity === 'High'
    }
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

  if (loading) return <div style={{ padding:40, textAlign:'center', color:'#9ca3af' }}>กำลังโหลด...</div>
  if (!incident) return <div style={{ padding:40, textAlign:'center', color:'#9ca3af' }}>ไม่พบข้อมูล</div>

  const isLocked = incident?.is_locked || incident?.status === 'Resolved'

  // SLA Calculation (Business Hours)
  const defaultWH = { start: '08:30', end: '17:30', work_days: [1, 2, 3, 4, 5] }
  const wh = workingHours || defaultWH
  const slaLimit = SLA_LIMITS[incident?.severity] || SLA_LIMITS.Medium
  const slaLabelText = SLA_LABELS[incident?.severity] || SLA_LABELS.Medium
  const responseLimit = SLA_MINUTES[incident?.severity]?.response || 60

  const respTime = incident?.acknowledged_at || incident?.assigned_at
  const responseMin = respTime 
    ? calculateNetBusinessMinutes(incident.created_at, respTime, wh, holidays, []) 
    : calculateNetBusinessMinutes(incident.created_at, new Date(), wh, holidays, [])
  const resolveMin = calculateNetBusinessMinutes(incident.created_at, incident?.resolved_at || new Date(), wh, holidays, exclusions)

  const responseState = !respTime ? 'waiting'
    : responseMin <= responseLimit ? 'done_ok' : 'done_late'
  const resolveState = incident?.resolved_at
    ? resolveMin <= slaLimit ? 'done_ok' : 'done_late'
    : resolveMin <= slaLimit ? 'counting' : 'counting_late'
    
  const activeExclusion = exclusions.find(e => !e.end_time)

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

  return (
    <>
      {showResolveDialog && <ResolveDialog incident={incident} form={form} setForm={setForm} onConfirm={handleResolve} onCancel={() => setShowResolveDialog(false)} isAutoApprove={isAutoApprove} />}
      {showReopenDialog && <ReopenDialog onConfirm={handleReopen} onCancel={() => setShowReopenDialog(false)} />}

      {/* SCREEN VIEW */}
      <div style={{ padding:24, maxWidth:900, margin:'0 auto' }}>

        {/* Topbar */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, flexWrap:'wrap', gap:10 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <Link href="/dashboard/incidents" style={{ color:'#6b7280', fontSize:13, textDecoration:'none' }}>← กลับ</Link>
            <h1 style={{ fontSize:18, fontWeight:600, color:'#111827', margin:0 }}>รายละเอียด Incident</h1>
            {isLocked && <span style={{ background:'#d1fae5', color:'#065f46', padding:'3px 10px', borderRadius:20, fontSize:12, fontWeight:500 }}>🔒 Resolved</span>}
          </div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {!isLocked && !incident.acknowledged_at && !incident.assigned_to && (
              <button onClick={handleAcknowledge} disabled={saving} style={{ padding:'7px 20px', border:'none', borderRadius:7, fontSize:13, background:'#1d4ed8', color:'#fff', cursor:'pointer', fontFamily:'inherit', fontWeight:600, boxShadow:'0 2px 4px rgba(29,78,216,0.3)' }}>
                ✅ รับเรื่อง (Acknowledge)
              </button>
            )}
            
            {incident.workflow_status === 'pending' && !isLocked && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', padding: '6px 12px', borderRadius: 8, fontSize: 13, color: '#92400e' }}>
                  ⏳ รอการอนุมัติปิดเคส (High Priority)
                </div>
                {(currentUser?.id === incident.assigned_approver_id || isSub || currentUser?.role === 'administrator') && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={handleRejectIncident} style={{ padding: '7px 14px', border: '1px solid #dc2626', borderRadius: 7, fontSize: 13, background: '#fff', color: '#dc2626', cursor: 'pointer' }}>❌ ตีกลับ</button>
                    <button onClick={() => setShowSignatureModal(true)} style={{ padding: '7px 14px', border: 'none', borderRadius: 7, fontSize: 13, background: '#059669', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>✅ อนุมัติและปิดงาน</button>
                  </div>
                )}
              </div>
            )}

            {isLocked ? (
              isSuperUser && !isVisitor && <button onClick={() => setShowReopenDialog(true)} style={{ padding:'7px 14px', border:'none', borderRadius:7, fontSize:13, background:'#fef3c7', color:'#92400e', cursor:'pointer', fontFamily:'inherit' }}>🔓 Reopen</button>
            ) : !editing ? (
              <>
                {!isVisitor && (
                  <>
                    <button onClick={() => setEditing(true)} style={{ padding:'7px 14px', border:'1px solid #d1d5db', borderRadius:7, fontSize:13, background:'#fff', cursor:'pointer', fontFamily:'inherit' }}>✏️ แก้ไข</button>
                    <button onClick={() => setShowResolveDialog(true)} style={{ padding:'7px 14px', border:'none', borderRadius:7, fontSize:13, background:'#059669', color:'#fff', cursor:'pointer', fontFamily:'inherit' }}>✅ Resolve</button>
                    <button onClick={handleDelete} style={{ padding:'7px 14px', border:'none', borderRadius:7, fontSize:13, background:'#fee2e2', color:'#991b1b', cursor:'pointer', fontFamily:'inherit' }}>🗑 ลบ</button>
                  </>
                )}
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
            
            {/* Require Corrective Action Checkbox */}
            <div style={{ marginBottom:14, padding:'8px 12px', background:form.require_ca?'#eff6ff':'#f9fafb', borderRadius:8, border:`1px solid ${form.require_ca?'#bfdbfe':'#e5e7eb'}`, transition:'all 0.2s' }}>
              <label style={{ display:'flex', alignItems:'center', gap:10, cursor: editing && form.severity!=='High' ? 'pointer' : 'default' }}>
                <input type="checkbox" checked={form.require_ca||false} 
                  disabled={!editing || form.severity==='High'}
                  onChange={e => setForm({...form, require_ca: e.target.checked})}
                  style={{ width:18, height:18, cursor: editing && form.severity!=='High' ? 'pointer' : 'default' }} />
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color:form.require_ca?'#1e40af':'#374151' }}>Require Corrective Action</div>
                  <div style={{ fontSize:11, color:'#6b7280' }} title="Corrective Action required for high severity or recurring incidents">
                    จำเป็นต้องระบุแนวทางแก้ไขเพื่อป้องกันการเกิดซ้ำ ℹ️
                  </div>
                </div>
              </label>
              {form.severity === 'High' && <div style={{ fontSize:10, color:'#1d4ed8', marginTop:4, fontWeight:500 }}>* บังคับสำหรับความรุนแรงระดับ High</div>}
            </div>

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
            {form.require_ca && field('Corrective Action (มาตรการแก้ไขป้องกัน)', 'corrective_action', 'textarea')}
          </div>
        </div>

        {/* SLA */}
        <div style={{ background:'#fff', borderRadius:10, border:'1px solid #e5e7eb', padding:20, marginBottom:16 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, paddingBottom:10, borderBottom:'1px solid #f3f4f6' }}>
            <div style={{ fontSize:13, fontWeight:600, color:'#374151' }}>⏱ SLA Analysis (Business Hours) — {incident.severity}</div>
            <div style={{ display:'flex', gap:8 }}>
              {!isLocked && (
                <>
                  <button onClick={() => setAddingExclusion(!addingExclusion)} style={{ padding:'5px 12px', border:'1px solid #d1d5db', borderRadius:6, fontSize:11, background:'#fff', cursor:'pointer' }}>
                    {addingExclusion ? 'Cancel' : '+ Manual Exclusion'}
                  </button>
                  {activeExclusion ? (
                    <button onClick={handleResumeSLA} style={{ padding:'5px 12px', background:'#10b981', color:'#fff', border:'none', borderRadius:6, fontSize:11, fontWeight:600, cursor:'pointer' }}>
                      ▶ Resume SLA
                    </button>
                  ) : (
                    <select 
                      onChange={(e) => { if(e.target.value) handlePauseSLA(e.target.value) }} 
                      style={{ padding:'4px 8px', borderRadius:6, border:'1px solid #d1d5db', fontSize:11, background:'#f9fafb' }}
                    >
                      <option value="">⏸ Pause SLA...</option>
                      {exclusionReasons.map(r => <option key={r.id} value={r.id}>{r.value}</option>)}
                    </select>
                  )}
                </>
              )}
            </div>
          </div>

          {addingExclusion && (
            <div style={{ background:'#f9fafb', border:'1px solid #e5e7eb', borderRadius:8, padding:16, marginBottom:16 }}>
              <div style={{ fontSize:12, fontWeight:600, color:'#374151', marginBottom:12 }}>➕ เพิ่มรายการพักเวลาแบบ Manual</div>
              <div className="grid-3-2-1" style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:10 }}>
                <div>
                  <label style={{ fontSize:10, color:'#6b7280', display:'block', marginBottom:4 }}>สาเหตุ</label>
                  <select value={newExclusion.reason_id} onChange={e => setNewExclusion({...newExclusion, reason_id:e.target.value})} style={{ width:'100%', padding:'6px', borderRadius:4, border:'1px solid #d1d5db', fontSize:12 }}>
                    <option value="">เลือกสาเหตุ...</option>
                    {exclusionReasons.map(r => <option key={r.id} value={r.id}>{r.value}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize:10, color:'#6b7280', display:'block', marginBottom:4 }}>เวลาเริ่ม</label>
                  <input type="datetime-local" value={newExclusion.start_time} onChange={e => setNewExclusion({...newExclusion, start_time:e.target.value})} style={{ width:'100%', padding:'5px', borderRadius:4, border:'1px solid #d1d5db', fontSize:12 }} />
                </div>
                <div>
                  <label style={{ fontSize:10, color:'#6b7280', display:'block', marginBottom:4 }}>เวลาจบ (ถ้ามี)</label>
                  <input type="datetime-local" value={newExclusion.end_time} onChange={e => setNewExclusion({...newExclusion, end_time:e.target.value})} style={{ width:'100%', padding:'5px', borderRadius:4, border:'1px solid #d1d5db', fontSize:12 }} />
                </div>
              </div>
              <div style={{ display:'flex', justifyContent:'flex-end' }}>
                <button onClick={handleAddExclusion} style={{ padding:'6px 16px', background:'#1d4ed8', color:'#fff', border:'none', borderRadius:4, fontSize:12, fontWeight:600, cursor:'pointer' }}>บันทึกรายการ</button>
              </div>
            </div>
          )}

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom: 16 }}>
            <SLAWidget label="Response Time" slaLabel={slaLabelText.response} state={responseState} actual={responseMin} />
            <SLAWidget label="Resolution Time (Net)" slaLabel={slaLabelText.resolve} state={resolveState} actual={resolveMin} />
          </div>

          {/* Exclusion History */}
          {exclusions.length > 0 && (
            <div style={{ border:'1px solid #f3f4f6', borderRadius:8, overflow:'hidden' }}>
              <table style={{ width:'100%', fontSize:11, borderCollapse:'collapse' }}>
                <thead>
                  <tr style={{ background:'#f9fafb', color:'#6b7280' }}>
                    <th style={{ padding:'6px 10px', textAlign:'left', fontWeight:500 }}>Pause Reason</th>
                    <th style={{ padding:'6px 10px', textAlign:'left', fontWeight:500 }}>Start</th>
                    <th style={{ padding:'6px 10px', textAlign:'left', fontWeight:500 }}>End</th>
                    <th style={{ padding:'6px 10px', textAlign:'center', fontWeight:500 }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {exclusions.map(ex => (
                    <tr key={ex.id} style={{ borderTop:'1px solid #f3f4f6' }}>
                      <td style={{ padding:'8px 10px', color:'#374151', fontWeight:500 }}>{ex.reason?.value || '—'}</td>
                      <td style={{ padding:'8px 10px', color:'#6b7280' }}>{formatDateTime(ex.start_time)}</td>
                      <td style={{ padding:'8px 10px', color:'#6b7280' }}>{ex.end_time ? formatDateTime(ex.end_time) : <span style={{ color:'#d97706', fontWeight:600 }}>⏸ Paused...</span>}</td>
                      <td style={{ padding:'8px 10px', textAlign:'center' }}>
                        {!isLocked && <button onClick={() => handleDeleteExclusion(ex.id)} style={{ background:'none', border:'none', color:'#dc2626', cursor:'pointer' }}>🗑</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div style={{ marginTop:12, pt:12, fontSize:11, color:'#9ca3af', display:'flex', gap:16, flexWrap:'wrap' }}>
            <span>⏱ ทำงาน: {workingHours?.start}-{workingHours?.end} ({workingHours?.work_days?.length} วัน/สัปดาห์)</span>
            <span>🌴 วันหยุด: {holidays.length} วัน</span>
            {exclusions.length > 0 && <span style={{ color: '#d97706', fontWeight: 600 }}>⏸ หักเวลาออก: {exclusions.length} รายการ</span>}
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

      {/* Signature Modal for PIN Approval */}
      <SignatureModal 
        isOpen={showSignatureModal}
        onCancel={() => setShowSignatureModal(false)}
        onConfirm={handleApproveIncident}
        approverName={currentUser?.full_name}
        userEmail={currentUser?.email}
        loading={approvalLoading}
      />
    </>
  )
}