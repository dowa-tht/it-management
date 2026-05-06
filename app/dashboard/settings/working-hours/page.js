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
  const [settings, setSettings] = useState({
    start: '08:30',
    end: '17:30',
    work_days: [1, 2, 3, 4, 5]
  })
  const [msg, setMsg] = useState({ text: '', type: '' })

  useEffect(() => {
    fetchSettings()
  }, [])

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
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>Working Hours Setup</h1>
        <div style={{ fontSize: 13, color: '#6b7280' }}>กำหนดเวลาทำงานและวันทำงานปกติเพื่อใช้ในการคำนวณ SLA</div>
      </div>

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

      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
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

          <div style={{ pt: 12, borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={handleSave}
              disabled={saving}
              className="save-button"
              style={{
                padding: '10px 32px', background: '#1d4ed8', color: '#fff', border: 'none',
                borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer',
                opacity: saving ? 0.7 : 1
              }}
            >
              {saving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}
            </button>
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
