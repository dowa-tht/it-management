'use client'
import { useState, useEffect, useRef } from 'react'
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

// ===== Signature Canvas Component =====
function SignatureCanvas({ onSave, onCancel, title }) {
  const canvasRef = useRef(null)
  const [drawing, setDrawing] = useState(false)
  const [hasDrawn, setHasDrawn] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = '#1a3fa0'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [])

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    if (e.touches) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY
      }
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    }
  }

  const startDraw = (e) => {
    e.preventDefault()
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const pos = getPos(e, canvas)
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
    setDrawing(true)
    setHasDrawn(true)
  }

  const draw = (e) => {
    e.preventDefault()
    if (!drawing) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const pos = getPos(e, canvas)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
  }

  const stopDraw = (e) => {
    e.preventDefault()
    setDrawing(false)
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    setHasDrawn(false)
  }

  const compressAndSave = () => {
    const canvas = canvasRef.current

    // Compress โดยวาดลงบน canvas เล็กลง
    const small = document.createElement('canvas')
    small.width = 300
    small.height = 100
    const ctx = small.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, 300, 100)
    ctx.drawImage(canvas, 0, 0, 300, 100)

    // Export เป็น JPEG quality ต่ำเพื่อให้ไม่เกิน 10KB
    let quality = 0.5
    let dataUrl = small.toDataURL('image/jpeg', quality)

    // ลด quality จนกว่าจะไม่เกิน 10KB
    while (dataUrl.length > 13000 && quality > 0.1) {
      quality -= 0.05
      dataUrl = small.toDataURL('image/jpeg', quality)
    }

    onSave(dataUrl)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: 16
    }}>
      <div style={{
        background: '#fff', borderRadius: 12, padding: 24,
        width: '100%', maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginBottom: 4 }}>
          ✍️ {title}
        </div>
        <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 16 }}>
          วาดลายเซ็นต์ในกรอบด้านล่าง (สีน้ำเงิน)
        </div>

        <div style={{
          border: '2px solid #d1d5db', borderRadius: 8,
          overflow: 'hidden', marginBottom: 12, cursor: 'crosshair',
          touchAction: 'none'
        }}>
          <canvas
            ref={canvasRef}
            width={440}
            height={160}
            style={{ display: 'block', width: '100%', height: 160 }}
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={stopDraw}
            onMouseLeave={stopDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={stopDraw}
          />
        </div>

        <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 16, textAlign: 'center' }}>
          ขนาดลายเซ็นต์จะถูก compress อัตโนมัติ (ไม่เกิน 10KB)
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
          <button onClick={clearCanvas} style={{
            padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: 7,
            fontSize: 13, background: '#fff', cursor: 'pointer', fontFamily: 'inherit', color: '#374151'
          }}>
            🗑 ล้าง
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onCancel} style={{
              padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: 7,
              fontSize: 13, background: '#fff', cursor: 'pointer', fontFamily: 'inherit'
            }}>
              ยกเลิก
            </button>
            <button
              onClick={compressAndSave}
              disabled={!hasDrawn}
              style={{
                padding: '8px 20px', border: 'none', borderRadius: 7,
                fontSize: 13, background: hasDrawn ? '#1d4ed8' : '#93c5fd',
                color: '#fff', cursor: hasDrawn ? 'pointer' : 'not-allowed', fontFamily: 'inherit'
              }}
            >
              ยืนยันลายเซ็นต์
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ===== Reopen Confirm Dialog =====
function ReopenDialog({ onConfirm, onCancel }) {
  const [text, setText] = useState('')
  const valid = text === 'REOPEN'

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: 16
    }}>
      <div style={{
        background: '#fff', borderRadius: 12, padding: 24,
        width: '100%', maxWidth: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#dc2626', marginBottom: 8 }}>
          ⚠️ Reopen Incident
        </div>
        <div style={{ fontSize: 13, color: '#374151', marginBottom: 16, lineHeight: 1.6 }}>
          การ Reopen จะปลดล็อคเอกสารและลบลายเซ็นต์ที่มีอยู่ออกทั้งหมด
          กรุณาพิมพ์ <strong style={{ color: '#dc2626', fontFamily: 'monospace' }}>REOPEN</strong> เพื่อยืนยัน
        </div>
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="พิมพ์ REOPEN"
          style={{
            width: '100%', padding: '10px 12px',
            border: `1px solid ${valid ? '#10b981' : '#d1d5db'}`,
            borderRadius: 8, fontSize: 14, fontFamily: 'monospace',
            marginBottom: 16, outline: 'none',
            background: valid ? '#f0fdf4' : '#fff'
          }}
        />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{
            padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: 7,
            fontSize: 13, background: '#fff', cursor: 'pointer', fontFamily: 'inherit'
          }}>
            ยกเลิก
          </button>
          <button
            onClick={onConfirm}
            disabled={!valid}
            style={{
              padding: '8px 20px', border: 'none', borderRadius: 7,
              fontSize: 13, background: valid ? '#dc2626' : '#fca5a5',
              color: '#fff', cursor: valid ? 'pointer' : 'not-allowed', fontFamily: 'inherit'
            }}
          >
            Reopen
          </button>
        </div>
      </div>
    </div>
  )
}

// ===== Resolve Confirm Dialog =====
function ResolveDialog({ form, setForm, onConfirm, onCancel }) {
  const [step, setStep] = useState(1)
  const [sigIT, setSigIT] = useState(null)
  const [showCanvas, setShowCanvas] = useState(false)

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: 16, overflowY: 'auto'
    }}>
      <div style={{
        background: '#fff', borderRadius: 12, padding: 24,
        width: '100%', maxWidth: 560, boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        margin: 'auto'
      }}>
        {/* Step Indicator */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {[
            { n: 1, label: 'ยืนยัน Resolution' },
            { n: 2, label: 'ลายเซ็นต์' },
            { n: 3, label: 'ตรวจสอบ' },
          ].map(s => (
            <div key={s.n} style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
              <div style={{
                width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                background: step >= s.n ? '#1d4ed8' : '#e5e7eb',
                color: step >= s.n ? '#fff' : '#9ca3af',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 600
              }}>{s.n}</div>
              <div style={{ fontSize: 11, color: step >= s.n ? '#1d4ed8' : '#9ca3af', fontWeight: step === s.n ? 600 : 400 }}>
                {s.label}
              </div>
              {s.n < 3 && <div style={{ flex: 1, height: 1, background: step > s.n ? '#1d4ed8' : '#e5e7eb' }} />}
            </div>
          ))}
        </div>

        {/* Step 1: ยืนยัน Resolution */}
        {step === 1 && (
          <>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#111827', marginBottom: 16 }}>
              ✅ ยืนยันการปิด Incident
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>
                วิธีการแก้ไข / Resolution <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <textarea
                value={form.resolution || ''}
                onChange={e => setForm({ ...form, resolution: e.target.value })}
                rows={4}
                placeholder="อธิบายวิธีการที่ใช้แก้ไขปัญหา และผลลัพธ์ที่ได้..."
                style={{
                  width: '100%', padding: '9px 12px',
                  border: '1px solid #d1d5db', borderRadius: 8,
                  fontSize: 13, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6
                }}
              />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>
                Root Cause Analysis
              </label>
              <textarea
                value={form.root_cause || ''}
                onChange={e => setForm({ ...form, root_cause: e.target.value })}
                rows={3}
                placeholder="วิเคราะห์สาเหตุที่แท้จริง..."
                style={{
                  width: '100%', padding: '9px 12px',
                  border: '1px solid #d1d5db', borderRadius: 8,
                  fontSize: 13, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={onCancel} style={{ padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: 7, fontSize: 13, background: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>ยกเลิก</button>
              <button
                onClick={() => { if (!form.resolution?.trim()) { alert('กรุณากรอก Resolution ก่อนครับ'); return } setStep(2) }}
                style={{ padding: '8px 20px', border: 'none', borderRadius: 7, fontSize: 13, background: '#1d4ed8', color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                ถัดไป →
              </button>
            </div>
          </>
        )}

        {/* Step 2: ลายเซ็นต์ */}
        {step === 2 && (
          <>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#111827', marginBottom: 8 }}>
              ✍️ ลายเซ็นต์ผู้ปิดเคส (IT Officer)
            </div>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 16 }}>
              วาดลายเซ็นต์เพื่อยืนยันการปิด Incident นี้
            </div>

            {sigIT ? (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: '#059669', marginBottom: 8, fontWeight: 500 }}>
                  ✅ ลายเซ็นต์บันทึกแล้ว
                </div>
                <div style={{ border: '1px solid #d1d5db', borderRadius: 8, overflow: 'hidden', display: 'inline-block' }}>
                  <img src={sigIT} alt="signature" style={{ display: 'block', height: 80, width: 'auto', maxWidth: '100%' }} />
                </div>
                <div style={{ marginTop: 8 }}>
                  <button onClick={() => setSigIT(null)} style={{ fontSize: 12, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                    🔄 วาดใหม่
                  </button>
                </div>
              </div>
            ) : (
              <div style={{
                border: '2px dashed #d1d5db', borderRadius: 8,
                padding: 24, textAlign: 'center', marginBottom: 16, cursor: 'pointer',
                background: '#f9fafb'
              }} onClick={() => setShowCanvas(true)}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>✍️</div>
                <div style={{ fontSize: 13, color: '#6b7280' }}>กดเพื่อวาดลายเซ็นต์</div>
              </div>
            )}

            {showCanvas && (
              <SignatureCanvas
                title="ลายเซ็นต์ IT Officer"
                onSave={(data) => { setSigIT(data); setShowCanvas(false) }}
                onCancel={() => setShowCanvas(false)}
              />
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
              <button onClick={() => setStep(1)} style={{ padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: 7, fontSize: 13, background: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>← ย้อนกลับ</button>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={onCancel} style={{ padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: 7, fontSize: 13, background: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>ยกเลิก</button>
                <button
                  onClick={() => { if (!sigIT) { alert('กรุณาวาดลายเซ็นต์ก่อนครับ'); return } setStep(3) }}
                  style={{ padding: '8px 20px', border: 'none', borderRadius: 7, fontSize: 13, background: '#1d4ed8', color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  ถัดไป →
                </button>
              </div>
            </div>
          </>
        )}

        {/* Step 3: ตรวจสอบ */}
        {step === 3 && (
          <>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#111827', marginBottom: 16 }}>
              🔍 ตรวจสอบก่อนบันทึก
            </div>

            <div style={{ background: '#f9fafb', borderRadius: 8, padding: 16, marginBottom: 16, fontSize: 13 }}>
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 2 }}>Resolution</div>
                <div style={{ color: '#111827', lineHeight: 1.6 }}>{form.resolution}</div>
              </div>
              {form.root_cause && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 2 }}>Root Cause</div>
                  <div style={{ color: '#111827', lineHeight: 1.6 }}>{form.root_cause}</div>
                </div>
              )}
              <div>
                <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 6 }}>ลายเซ็นต์ IT Officer</div>
                <div style={{ border: '1px solid #e5e7eb', borderRadius: 6, overflow: 'hidden', display: 'inline-block', background: '#fff' }}>
                  <img src={sigIT} alt="signature" style={{ display: 'block', height: 60, width: 'auto' }} />
                </div>
              </div>
            </div>

            <div style={{
              background: '#fffbeb', border: '1px solid #fcd34d',
              borderRadius: 8, padding: '10px 14px', fontSize: 12,
              color: '#92400e', marginBottom: 16
            }}>
              ⚠️ เมื่อบันทึกแล้ว เอกสารจะถูกล็อคและไม่สามารถแก้ไขได้ (ยกเว้น Super User)
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
              <button onClick={() => setStep(2)} style={{ padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: 7, fontSize: 13, background: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>← ย้อนกลับ</button>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={onCancel} style={{ padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: 7, fontSize: 13, background: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>ยกเลิก</button>
                <button
                  onClick={() => onConfirm(sigIT)}
                  style={{ padding: '8px 20px', border: 'none', borderRadius: 7, fontSize: 13, background: '#059669', color: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}
                >
                  ✅ ยืนยัน Resolve
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

  // Dialogs
  const [showResolveDialog, setShowResolveDialog] = useState(false)
  const [showReopenDialog, setShowReopenDialog] = useState(false)

  useEffect(() => {
    initUser()
    fetchIncident()
    fetchLogs()
  }, [id])

  const initUser = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    setCurrentUser(session.user)
    const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', session.user.id).single()
    setIsSuperUser(profile?.role === 'superuser')
  }

  const fetchIncident = async () => {
    const { data } = await supabase.from('incidents').select('*').eq('id', id).single()
    setIncident(data)
    setForm(data || {})
    setLoading(false)
  }

  const fetchLogs = async () => {
    const { data } = await supabase.from('incident_logs')
      .select('*').eq('incident_id', id)
      .order('created_at', { ascending: true })
    setLogs(data || [])
  }

  const addLog = async (action, fromStatus, toStatus, note = '') => {
    await supabase.from('incident_logs').insert([{
      incident_id: id,
      action,
      from_status: fromStatus,
      to_status: toStatus,
      note,
      user_email: currentUser?.email,
    }])
    await fetchLogs()
  }

  // บันทึกการแก้ไขปกติ (ไม่ใช่ Resolve)
  const handleSave = async () => {
    setSaving(true)
    const oldStatus = incident.status
    const newStatus = form.status

    await supabase.from('incidents').update(form).eq('id', id)

    if (oldStatus !== newStatus) {
      await addLog('เปลี่ยนสถานะ', oldStatus, newStatus)
    } else {
      await addLog('แก้ไขข้อมูล', oldStatus, oldStatus, 'อัปเดตรายละเอียด')
    }

    setIncident(form)
    setEditing(false)
    setSaving(false)
  }

  // Resolve พร้อมลายเซ็นต์
  const handleResolve = async (sigIT) => {
    setSaving(true)
    const now = new Date().toISOString()
    const updateData = {
      ...form,
      status: 'Resolved',
      is_locked: true,
      resolved_at: now,
      resolved_by: currentUser?.email,
      signature_it: sigIT,
    }

    await supabase.from('incidents').update(updateData).eq('id', id)
    await addLog('ปิดเคส (Resolved)', incident.status, 'Resolved', `ลงนามโดย: ${currentUser?.email}`)

    setIncident(updateData)
    setForm(updateData)
    setShowResolveDialog(false)
    setSaving(false)
  }

  // Reopen โดย Super User
  const handleReopen = async () => {
    setSaving(true)
    const updateData = {
      ...incident,
      status: 'Open',
      is_locked: false,
      resolved_at: null,
      resolved_by: null,
      signature_it: null,
    }

    await supabase.from('incidents').update(updateData).eq('id', id)
    await addLog('Reopen', 'Resolved', 'Open', `Reopen โดย Super User: ${currentUser?.email}`)

    setIncident(updateData)
    setForm(updateData)
    setShowReopenDialog(false)
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!confirm('ต้องการลบ Incident นี้ใช่ไหม?')) return
    await supabase.from('incidents').delete().eq('id', id)
    router.push('/dashboard/incidents')
  }

  const isLocked = incident?.is_locked || incident?.status === 'Resolved'

  const SLAResponse = incident?.severity === 'High' ? 'ทันที (ภายใน 1 ชั่วโมง)' : incident?.severity === 'Medium' ? 'ภายใน 2 ชั่วโมง' : 'ภายใน 6 ชั่วโมง'
  const SLAResolve = incident?.severity === 'High' ? 'ภายใน 4 ชั่วโมง' : incident?.severity === 'Medium' ? 'ภายใน 8 ชั่วโมง' : 'ภายใน 3 วันทำการ'

  const field = (label, key, type = 'text', options = null) => (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>{label}</div>
      {editing && !isLocked ? (
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
        <div style={{ fontSize: 14, color: incident?.[key] ? '#111827' : '#d1d5db', padding: '6px 0', borderBottom: '1px solid #f3f4f6', minHeight: 32, whiteSpace: 'pre-wrap' }}>
          {incident?.[key] || '—'}
        </div>
      )}
    </div>
  )

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>กำลังโหลด...</div>
  if (!incident) return <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>ไม่พบข้อมูล</div>

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { background: white !important; margin: 0; }
        }
        @media screen { .print-only { display: none !important; } }
      `}</style>

      {/* Dialogs */}
      {showResolveDialog && (
        <ResolveDialog
          form={form}
          setForm={setForm}
          onConfirm={handleResolve}
          onCancel={() => setShowResolveDialog(false)}
        />
      )}
      {showReopenDialog && (
        <ReopenDialog
          onConfirm={handleReopen}
          onCancel={() => setShowReopenDialog(false)}
        />
      )}

      {/* SCREEN VIEW */}
      <div className="no-print" style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>

        {/* Topbar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link href="/dashboard/incidents" style={{ color: '#6b7280', fontSize: 13, textDecoration: 'none' }}>← กลับ</Link>
            <h1 style={{ fontSize: 18, fontWeight: 600, color: '#111827', margin: 0 }}>รายละเอียด Incident</h1>
            {isLocked && (
              <span style={{ background: '#d1fae5', color: '#065f46', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500 }}>
                🔒 Resolved
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={() => window.print()} style={{ padding: '7px 14px', border: '1px solid #d1d5db', borderRadius: 7, fontSize: 13, background: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>
              🖨 Print FR-IT-01
            </button>

            {isLocked ? (
              isSuperUser && (
                <button onClick={() => setShowReopenDialog(true)} style={{ padding: '7px 14px', border: 'none', borderRadius: 7, fontSize: 13, background: '#fef3c7', color: '#92400e', cursor: 'pointer', fontFamily: 'inherit' }}>
                  🔓 Reopen
                </button>
              )
            ) : (
              <>
                {!editing ? (
                  <>
                    <button onClick={() => setEditing(true)} style={{ padding: '7px 14px', border: '1px solid #d1d5db', borderRadius: 7, fontSize: 13, background: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>
                      ✏️ แก้ไข
                    </button>
                    <button onClick={() => setShowResolveDialog(true)} style={{ padding: '7px 14px', border: 'none', borderRadius: 7, fontSize: 13, background: '#059669', color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>
                      ✅ Resolve
                    </button>
                    <button onClick={handleDelete} style={{ padding: '7px 14px', border: 'none', borderRadius: 7, fontSize: 13, background: '#fee2e2', color: '#991b1b', cursor: 'pointer', fontFamily: 'inherit' }}>
                      🗑 ลบ
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => { setEditing(false); setForm(incident) }} style={{ padding: '7px 14px', border: '1px solid #d1d5db', borderRadius: 7, fontSize: 13, background: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>
                      ยกเลิก
                    </button>
                    <button onClick={handleSave} disabled={saving} style={{ padding: '7px 16px', border: 'none', borderRadius: 7, fontSize: 13, background: '#1d4ed8', color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>
                      {saving ? 'กำลังบันทึก...' : '💾 บันทึก'}
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* Locked Banner */}
        {isLocked && (
          <div style={{ background: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 16 }}>🔒</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#065f46' }}>เอกสารปิดแล้ว (Resolved)</div>
              <div style={{ fontSize: 12, color: '#059669' }}>
                ปิดโดย: {incident.resolved_by || '—'} เมื่อ {formatDateTime(incident.resolved_at)}
                {isSuperUser && ' · Super User สามารถ Reopen ได้'}
              </div>
            </div>
          </div>
        )}

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
            <div>วันที่แจ้ง: <span style={{ color: '#374151' }}>{formatDateTime(incident.created_at)}</span></div>
            <div>ผู้แจ้ง: <span style={{ color: '#374151' }}>{incident.reported_by || '—'}</span></div>
            <div>ผู้รับผิดชอบ: <span style={{ color: '#374151' }}>{incident.assigned_to || '—'}</span></div>
            {incident.resolved_at && <div>วันที่ปิด: <span style={{ color: '#059669', fontWeight: 500 }}>{formatDateTime(incident.resolved_at)}</span></div>}
          </div>
        </div>

        {/* Detail Grid */}
        <div className="detail-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid #f3f4f6' }}>ข้อมูลหลัก</div>
            {field('ระบบที่ได้รับผลกระทบ', 'affected_system')}
            {field('ประเภท Incident', 'category')}
            {field('ระดับความรุนแรง', 'severity', 'select', ['High', 'Medium', 'Low'])}
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

        {/* Signature Section */}
        {incident.signature_it && (
          <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: 20, marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid #f3f4f6' }}>
              ✍️ ลายเซ็นต์ดิจิตัล
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div>
                <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 8 }}>IT Officer</div>
                <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden', background: '#fafafa', display: 'inline-block' }}>
                  <img src={incident.signature_it} alt="IT Officer Signature" style={{ display: 'block', height: 80, width: 'auto', maxWidth: 280 }} />
                </div>
                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 6 }}>
                  {incident.resolved_by} · {formatDateTime(incident.resolved_at)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SLA */}
        <div style={{ background: '#eff6ff', borderRadius: 10, border: '1px solid #bfdbfe', padding: 16, fontSize: 13, marginBottom: 16 }}>
          <div style={{ fontWeight: 600, color: '#1e40af', marginBottom: 8 }}>SLA — {incident.severity}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, color: '#374151' }}>
            <div>⏱ Response: <strong>{SLAResponse}</strong></div>
            <div>✅ Resolution: <strong>{SLAResolve}</strong></div>
          </div>
        </div>

        {/* Transaction Log Timeline */}
        <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 16, paddingBottom: 10, borderBottom: '1px solid #f3f4f6' }}>
            📋 Transaction Log
          </div>
          {logs.length === 0 ? (
            <div style={{ color: '#9ca3af', fontSize: 13, textAlign: 'center', padding: '16px 0' }}>ยังไม่มี Log</div>
          ) : (
            <div style={{ position: 'relative' }}>
              {logs.map((log, i) => (
                <div key={log.id} style={{ display: 'flex', gap: 12, marginBottom: i < logs.length - 1 ? 16 : 0 }}>
                  {/* Timeline dot */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: log.action.includes('Resolved') || log.action.includes('ปิดเคส') ? '#d1fae5'
                        : log.action.includes('Reopen') ? '#fef3c7'
                          : '#dbeafe',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0
                    }}>
                      {log.action.includes('ปิดเคส') || log.action.includes('Resolved') ? '✅'
                        : log.action.includes('Reopen') ? '🔓'
                          : log.action.includes('สถานะ') ? '🔄'
                            : '📝'}
                    </div>
                    {i < logs.length - 1 && (
                      <div style={{ width: 1, flex: 1, background: '#e5e7eb', marginTop: 4 }} />
                    )}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, paddingBottom: i < logs.length - 1 ? 8 : 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 4 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>{log.action}</div>
                      <div style={{ fontSize: 11, color: '#9ca3af', whiteSpace: 'nowrap' }}>
                        {formatDateTime(log.created_at)}
                      </div>
                    </div>
                    {log.from_status && log.to_status && log.from_status !== log.to_status && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                        <span style={{ ...STATUS_COLORS[log.from_status], padding: '1px 8px', borderRadius: 20, fontSize: 11 }}>{log.from_status}</span>
                        <span style={{ color: '#9ca3af', fontSize: 12 }}>→</span>
                        <span style={{ ...STATUS_COLORS[log.to_status], padding: '1px 8px', borderRadius: 20, fontSize: 11 }}>{log.to_status}</span>
                      </div>
                    )}
                    {log.note && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{log.note}</div>}
                    {log.user_email && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>โดย: {log.user_email}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
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
          </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 10 }}>
          <tbody>
            <tr>
              <td style={{ border: '1px solid #000', padding: '5px 8px', background: '#f5f5f5', fontWeight: 600, fontSize: 11, width: 130 }}>Case Number</td>
              <td style={{ border: '1px solid #000', padding: '5px 8px', fontSize: 12 }}>{incident.case_number}</td>
              <td style={{ border: '1px solid #000', padding: '5px 8px', background: '#f5f5f5', fontWeight: 600, fontSize: 11, width: 130 }}>วันที่แจ้ง</td>
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
              <td style={{ border: '1px solid #000', padding: '5px 8px', fontSize: 12 }}><strong>{incident.severity}</strong> — Response: {SLAResponse}</td>
              <td style={{ border: '1px solid #000', padding: '5px 8px', background: '#f5f5f5', fontWeight: 600, fontSize: 11 }}>สถานะ</td>
              <td style={{ border: '1px solid #000', padding: '5px 8px', fontSize: 12 }}><strong>{incident.status}</strong></td>
            </tr>
          </tbody>
        </table>

        {[
          { label: 'หัวข้อ / อาการที่พบ', value: incident.title, height: 36 },
          { label: 'รายละเอียด / Description', value: incident.description, height: 56 },
          { label: 'Root Cause Analysis', value: incident.root_cause, height: 56 },
          { label: 'วิธีการแก้ไข / Resolution', value: incident.resolution, height: 56 },
        ].map((item, i) => (
          <div key={i} style={{ border: '1px solid #000', borderTop: i === 0 ? '1px solid #000' : 'none' }}>
            <div style={{ background: '#f0f0f0', padding: '4px 8px', fontWeight: 700, fontSize: 11, borderBottom: '1px solid #000' }}>{item.label}</div>
            <div style={{ padding: '6px 10px', fontSize: 12, minHeight: item.height, whiteSpace: 'pre-wrap' }}>{item.value || '—'}</div>
          </div>
        ))}

        {/* Transaction Log in Print */}
        <div style={{ border: '1px solid #000', borderTop: 'none' }}>
          <div style={{ background: '#f0f0f0', padding: '4px 8px', fontWeight: 700, fontSize: 11, borderBottom: '1px solid #000' }}>Transaction Log</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9f9f9' }}>
                {['วันที่/เวลา', 'การดำเนินการ', 'สถานะ', 'โดย', 'หมายเหตุ'].map(h => (
                  <th key={h} style={{ border: '1px solid #ddd', padding: '3px 6px', fontSize: 10, fontWeight: 600, textAlign: 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id}>
                  <td style={{ border: '1px solid #ddd', padding: '3px 6px', fontSize: 10, whiteSpace: 'nowrap' }}>{formatDateTime(log.created_at)}</td>
                  <td style={{ border: '1px solid #ddd', padding: '3px 6px', fontSize: 10 }}>{log.action}</td>
                  <td style={{ border: '1px solid #ddd', padding: '3px 6px', fontSize: 10, whiteSpace: 'nowrap' }}>
                    {log.from_status !== log.to_status ? `${log.from_status} → ${log.to_status}` : log.to_status}
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '3px 6px', fontSize: 10 }}>{log.user_email}</td>
                  <td style={{ border: '1px solid #ddd', padding: '3px 6px', fontSize: 10 }}>{log.note || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Timeline + Signature */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 10 }}>
          <tbody>
            <tr>
              <td style={{ border: '1px solid #000', padding: '5px 8px', background: '#f5f5f5', fontWeight: 600, fontSize: 11, width: 130 }}>วันที่/เวลาแจ้ง</td>
              <td style={{ border: '1px solid #000', padding: '5px 8px', fontSize: 12 }}>{formatDateTime(incident.created_at)}</td>
              <td style={{ border: '1px solid #000', padding: '5px 8px', background: '#f5f5f5', fontWeight: 600, fontSize: 11, width: 130 }}>วันที่/เวลาปิด</td>
              <td style={{ border: '1px solid #000', padding: '5px 8px', fontSize: 12 }}>{formatDateTime(incident.resolved_at)}</td>
            </tr>
          </tbody>
        </table>

        {/* Signature Print */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 10 }}>
          <tbody>
            <tr>
              <td style={{ border: '1px solid #000', padding: '8px', width: '50%', verticalAlign: 'top' }}>
                <div style={{ fontSize: 11, color: '#666', marginBottom: 6 }}>ลายเซ็นต์ IT Officer</div>
                {incident.signature_it ? (
                  <>
                    <img src={incident.signature_it} alt="IT Signature" style={{ height: 60, display: 'block' }} />
                    <div style={{ fontSize: 10, color: '#666', marginTop: 4 }}>{incident.resolved_by}</div>
                    <div style={{ fontSize: 10, color: '#666' }}>{formatDateTime(incident.resolved_at)}</div>
                  </>
                ) : (
                  <>
                    <div style={{ minHeight: 50 }}></div>
                    <div style={{ fontSize: 11, borderTop: '1px dotted #999', paddingTop: 4, marginTop: 8 }}>ชื่อ: .................................................. วันที่: ....................</div>
                  </>
                )}
              </td>
              <td style={{ border: '1px solid #000', padding: '8px', width: '50%', verticalAlign: 'top' }}>
                <div style={{ fontSize: 11, color: '#666', marginBottom: 6 }}>ลายเซ็นต์ผู้จัดการ / Senior Manager (High only)</div>
                <div style={{ minHeight: 50 }}></div>
                <div style={{ fontSize: 11, borderTop: '1px dotted #999', paddingTop: 4, marginTop: 8 }}>ชื่อ: .................................................. วันที่: ....................</div>
              </td>
            </tr>
          </tbody>
        </table>

        <div style={{ marginTop: 10, textAlign: 'right', fontSize: 10, color: '#999' }}>
          พิมพ์เมื่อ: {formatDateTime(new Date().toISOString())} | DOWA IT System | FR-IT-01 Rev.00
        </div>
      </div>
    </>
  )
}