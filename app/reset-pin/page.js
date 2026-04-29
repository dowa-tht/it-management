'use client'
import { useState } from 'react'
import Link from 'next/link'

export default function ResetPinPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ text: '', type: '' })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage({ text: '', type: '' })

    try {
      const res = await fetch('/api/guest/reset-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })
      const data = await res.json()

      if (res.ok) {
        setMessage({ 
          text: 'ส่ง PIN ใหม่ไปที่อีเมลของคุณเรียบร้อยแล้ว กรุณาตรวจสอบ Inbox (หรือ Junk Mail)', 
          type: 'success' 
        })
        setEmail('')
      } else {
        setMessage({ text: data.error || 'เกิดข้อผิดพลาด', type: 'error' })
      }
    } catch (err) {
      setMessage({ text: 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#0f172a',
      backgroundImage: 'radial-gradient(circle at 50% 50%, #1e293b 0%, #0f172a 100%)',
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      padding: '24px',
      fontFamily: 'Inter, sans-serif'
    }}>
      <div style={{ width: '100%', maxWidth: '400px', textAlign: 'center' }}>
        
        <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#f8fafc', marginBottom: '8px' }}>
          Reset Guest PIN
        </h1>
        <p style={{ color: '#94a3b8', marginBottom: '32px' }}>
          ระบุอีเมลของคุณเพื่อรับรหัส PIN ใหม่
        </p>

        <form onSubmit={handleSubmit} style={{ 
          background: 'rgba(30, 41, 59, 0.5)', 
          backdropFilter: 'blur(16px)',
          padding: '32px',
          borderRadius: '24px',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          
          <div style={{ marginBottom: '24px', textAlign: 'left' }}>
            <label style={{ color: '#cbd5e1', fontSize: '14px', marginBottom: '8px', display: 'block' }}>
              Registered Email
            </label>
            <input 
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@company.com"
              style={{ 
                width: '100%', 
                padding: '12px 16px', 
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                color: '#fff',
                outline: 'none'
              }}
            />
          </div>

          {message.text && (
            <div style={{ 
              color: message.type === 'success' ? '#34d399' : '#f87171', 
              fontSize: '14px', 
              marginBottom: '20px',
              padding: '12px',
              background: message.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              borderRadius: '8px',
              textAlign: 'left'
            }}>
              {message.type === 'success' ? '✅ ' : '⚠️ '}{message.text}
            </div>
          )}

          <button 
            type="submit"
            disabled={loading}
            style={{ 
              width: '100%', 
              padding: '14px', 
              background: '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: '12px',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            {loading ? 'Processing...' : 'Send New PIN'}
          </button>

          <div style={{ marginTop: '24px' }}>
            <Link href="/guest-access" style={{ color: '#94a3b8', fontSize: '14px', textDecoration: 'none' }}>
              ← กลับไปหน้า Login
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
