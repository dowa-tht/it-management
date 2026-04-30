'use client'
import { useState, useEffect } from 'react'

export default function DebugEnvPage() {
  const [status, setStatus] = useState(null)

  useEffect(() => {
    async function check() {
      try {
        const response = await fetch('/api/debug-env')
        const data = await response.json()
        setStatus(data)
      } catch (err) {
        setStatus({ error: 'Failed to fetch status' })
      }
    }
    check()
  }, [])

  if (!status) return <div style={{ padding: 40, color: 'white', background: '#0a0f16', minHeight: '100vh' }}>กำลังตรวจสอบระบบ...</div>

  return (
    <div style={{ padding: 40, color: 'white', background: '#0a0f16', minHeight: '100vh', fontFamily: 'monospace' }}>
      <h1 style={{ color: '#3b82f6' }}>System Diagnostic</h1>
      <hr style={{ borderColor: 'rgba(255,255,255,0.1)', marginBottom: 20 }} />
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
        {Object.entries(status).map(([key, val]) => (
          <div key={key} style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(255,255,255,0.05)', padding: 15, borderRadius: 8 }}>
            <span>{key}</span>
            <span style={{ color: val === 'PRESENT' ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>{val}</span>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 40, fontSize: 12, color: '#64748b' }}>
        * หน้านี้ใช้ตรวจสอบการตั้งค่า Environment Variables เท่านั้น ไม่มีการแสดงข้อมูลที่เป็นความลับ
      </div>
    </div>
  )
}
