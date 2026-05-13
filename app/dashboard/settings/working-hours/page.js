'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const DAYS = [
  { id: 1, label: 'Monday', short: 'Mon' },
  { id: 2, label: 'Tuesday', short: 'Tue' },
  { id: 3, label: 'Wednesday', short: 'Wed' },
  { id: 4, label: 'Thursday', short: 'Thu' },
  { id: 5, label: 'Friday', short: 'Fri' },
  { id: 6, label: 'Saturday', short: 'Sat' },
  { id: 0, label: 'Sunday', short: 'Sun' },
]

export default function WorkingHoursPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState({ text: '', type: '' })
  const [showGuide, setShowGuide] = useState(false)
  const [guideContent, setGuideContent] = useState('')
  const [editingGuide, setEditingGuide] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [settings, setSettings] = useState({
    start: '08:30',
    end: '17:30',
    work_days: [1, 2, 3, 4, 5]
  })

  useEffect(() => {
    fetchSettings()
    fetchGuide()
    checkUser()
  }, [])

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      const { data: profile } = await supabase.from('user_profiles').select('*').eq('id', session.user.id).single()
      setCurrentUser(profile)
    }
  }

  const fetchGuide = async () => {
    const { data } = await supabase.from('system_settings').select('value').eq('key', 'working_hours_guide_content').single()
    if (data) setGuideContent(data.value)
    else {
      setGuideContent(`### ⏰ คู่มือการตั้งค่าเวลาทำการ (Working Hours Guide)
การกำหนดเวลาทำงานที่ถูกต้องช่วยให้ระบบคำนวณ SLA (Service Level Agreement) ได้อย่างแม่นยำ

---
#### **1. เวลาทำงานปกติ**
- กำหนดเวลาเริ่มงาน (Start) และเวลาเลิกงาน (End) ขององค์กร
- เวลานี้จะถูกนำไปใช้คำนวณเวลาที่ผ่านไปในแต่ละ Ticket โดยไม่รวมนอกเวลาทำงาน

---
#### **2. วันหยุดประจำสัปดาห์**
- ติ๊กถูกที่ช่อง **Is Working Day** สำหรับวันที่เป็นวันทำงาน
- วันที่ไม่ได้เลือก ระบบจะถือเป็น Non-working Day และจะไม่นำมานับ SLA
- โดยปกติคือ จันทร์ - ศุกร์`)
    }
  }

  const handleSaveGuide = async () => {
    setSaving(true)
    await supabase.from('system_settings').upsert({ key: 'working_hours_guide_content', value: guideContent, updated_at: new Date().toISOString() })
    setMsg({ text: 'บันทึกคู่มือสำเร็จ', type: 'success' })
    setEditingGuide(false)
    setSaving(false)
  }

  const fetchSettings = async () => {
    const { data, error } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'working_hours')
      .single()
    
    if (data) {
      setSettings(data.value)
    }
    setLoading(false)
  }

  const handleToggleDay = (dayId) => {
    setSettings(prev => {
      const isSelected = prev.work_days.includes(dayId)
      if (isSelected) {
        return { ...prev, work_days: prev.work_days.filter(id => id !== dayId) }
      } else {
        return { ...prev, work_days: [...prev.work_days, dayId].sort() }
      }
    })
  }

  const handleSave = async () => {
    setSaving(true)
    const { error } = await supabase
      .from('system_settings')
      .upsert({ key: 'working_hours', value: settings, updated_at: new Date().toISOString() })
    
    if (error) {
      setMsg({ text: `Error: ${error.message}`, type: 'error' })
    } else {
      setMsg({ text: 'บันทึกการตั้งค่าเวลาทำงานเรียบร้อยแล้ว', type: 'success' })
      setTimeout(() => setMsg({ text: '', type: '' }), 3000)
    }
    setSaving(false)
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>กำลังโหลด...</div>

  return (
    <div className="working-hours-container" style={{ padding: 'var(--page-padding, 24px)', maxWidth: 800, margin: '0 auto', background: '#f8fafc', minHeight: '100vh', paddingBottom: 60 }}>
      <style>{`
        :root { --page-padding: 24px; }
        @media (max-width: 768px) {
          :root { --page-padding: 12px; }
          .time-grid { grid-template-columns: 1fr !important; gap: 16px !important; }
          .save-button { width: 100% !important; }
          .day-button { flex: 1 1 30% !important; text-align: center !important; padding: 10px 8px !important; font-size: 12px !important; }
        }
        * { box-sizing: border-box; }
      `}</style>
      <div className="header-flex" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20, marginBottom: 32 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 20, boxShadow: '0 10px 15px -3px rgba(245, 158, 11, 0.3)' }}>
              ⏰
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '0', display: 'flex', alignItems: 'center', gap: 12 }}>
              Working Hours & SLA
              <button onClick={() => setShowGuide(true)} style={{ border: 'none', background: '#fffbeb', width: 34, height: 34, borderRadius: 10, cursor: 'pointer', fontSize: 18 }}>📖</button>
            </h1>
          </div>
          <p style={{ color: '#64748b', fontSize: 15, margin: 0 }}>ตั้งค่าเวลาทำงานและวันหยุดเพื่อใช้ในการคำนวณ SLA</p>
        </div>
        <div className="action-dock" style={{ display: 'flex', gap: 6, padding: '6px', background: '#fff', borderRadius: 20, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <button
            onClick={handleSave}
            disabled={saving}
            className="header-button"
            style={{
              padding: '10px 24px', background: 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)', color: '#fff', border: 'none',
              borderRadius: 14, fontSize: 13, fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 12px rgba(29, 78, 216, 0.2)',
              opacity: saving ? 0.7 : 1
            }}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>

      {showGuide && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }}>
          <div style={{ background: '#fff', borderRadius: 28, width: 800, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div style={{ padding: '28px 36px', background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{display:'flex', alignItems:'center', gap:16}}><span style={{fontSize:28}}>⏰</span><div><h3 style={{margin:0, fontSize:22, fontWeight:800}}>Working Hours Guide</h3><p style={{margin:0, fontSize:13, opacity:0.85}}>คู่มือการจัดการเวลาทำงานและ SLA</p></div></div>
              <div style={{ display: 'flex', gap: 12 }}>
                {currentUser?.role === 'admin' && <button onClick={() => setEditingGuide(!editingGuide)} style={{ padding: '8px 18px', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 12, color: '#fff', cursor: 'pointer', fontWeight: 600 }}>{editingGuide ? '👁 View' : '✏️ Edit'}</button>}
                <button onClick={() => { setShowGuide(false); setEditingGuide(false); }} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 32, cursor: 'pointer' }}>&times;</button>
              </div>
            </div>
            <div style={{ padding: 40, overflowY: 'auto', flex: 1, background: '#f8fafc' }}>
              {editingGuide ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <textarea value={guideContent} onChange={e => setGuideContent(e.target.value)} style={{ width: '100%', minHeight: 450, padding: 24, borderRadius: 20, border: '1px solid #e2e8f0', fontFamily: 'monospace', fontSize: 14 }} />
                  <button onClick={handleSaveGuide} style={{ padding: '14px 36px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 14, cursor: 'pointer', fontWeight: 700, alignSelf: 'flex-end' }}>บันทึกคู่มือ</button>
                </div>
              ) : (
                <div style={{ maxWidth: 700, margin: '0 auto' }}>
                  {guideContent.split('---').map((section, sIdx) => (
                    <div key={sIdx} style={{ background: section.includes('####') ? '#fff' : 'transparent', borderRadius: 20, padding: section.includes('####') ? 28 : 0, marginBottom: section.includes('####') ? 24 : 36, borderLeft: section.includes('####') ? `6px solid #1d4ed8` : 'none', boxShadow: section.includes('####') ? '0 4px 12px rgba(0,0,0,0.05)' : 'none' }}>
                      <div style={{ fontSize: 15, color: '#334155', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                        {section.trim().split('\n').map((line, lIdx) => {
                          if (line.startsWith('####')) return <h4 key={lIdx} style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: 800, color: '#1e293b' }}>{line.replace(/#/g, '').trim()}</h4>
                          if (line.startsWith('###')) return <h3 key={lIdx} style={{ margin: '0 0 24px 0', fontSize: 24, fontWeight: 900, color: '#0f172a' }}>{line.replace(/#/g, '').trim()}</h3>
                          return <p key={lIdx} style={{ margin: '0 0 10px 0' }}>{line.includes('**') ? line.split('**').map((p,i)=>i%2===1?<strong key={i} style={{color:'#1e3a8a'}}>{p}</strong>:p) : line}</p>
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {msg.text && (
        <div style={{ 
          padding: '12px 16px', borderRadius: 8, fontSize: 13, marginBottom: 20,
          background: msg.type === 'success' ? '#d1fae5' : '#fee2e2', 
          color: msg.type === 'success' ? '#065f46' : '#991b1b', 
          border: `1px solid ${msg.type === 'success' ? '#a7f3d0' : '#fecaca'}` 
        }}>
          {msg.type === 'success' ? '✅' : '❌'} {msg.text}
        </div>
      )}

      <div style={{ background: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(20px)', borderRadius: 24, border: '1px solid rgba(226, 232, 240, 0.8)', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05)' }}>
        <div style={{ padding: 'var(--page-padding, 24px)' }}>
          <div className="time-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>เวลาเริ่มงาน (Start Time)</label>
              <input 
                type="time" 
                value={settings.start} 
                onChange={e => setSettings({...settings, start: e.target.value})}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', outline: 'none', fontSize: 14 }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>เวลาเลิกงาน (End Time)</label>
              <input 
                type="time" 
                value={settings.end} 
                onChange={e => setSettings({...settings, end: e.target.value})}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', outline: 'none', fontSize: 14 }}
              />
            </div>
          </div>

          <div style={{ marginBottom: 32 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 12 }}>วันทำงาน (Working Days)</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {DAYS.map(day => {
                const isSelected = settings.work_days.includes(day.id)
                return (
                  <button
                    key={day.id}
                    onClick={() => handleToggleDay(day.id)}
                    className="day-button"
                    style={{
                      padding: '10px 20px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer',
                      border: isSelected ? '1px solid #1d4ed8' : '1px solid #d1d5db',
                      background: isSelected ? '#eff6ff' : '#fff',
                      color: isSelected ? '#1d4ed8' : '#374151',
                      transition: 'all 0.15s'
                    }}
                  >
                    {day.label}
                  </button>
                )
              })}
            </div>
          </div>


        </div>

        <div style={{ background: '#f9fafb', padding: '16px 24px', borderTop: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 18 }}>💡</span>
            <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.5 }}>
              <b>หมายเหตุ:</b> ค่าที่ตั้งไว้นี้จะถูกนำไปใช้คำนวณระยะเวลาของ Incident ในรูปแบบ Business Hours (หักลบเวลานอกทำการและวันหยุดออก) เพื่อให้การวัดผล KPI 95% เป็นไปอย่างถูกต้องและยุติธรรม
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
