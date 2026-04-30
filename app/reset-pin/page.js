'use client'
import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { requestRecovery, resetPINWithToken } from '@/app/actions/recovery'

function ResetPinContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')
  
  const [email, setEmail] = useState('')
  const [newPIN, setNewPIN] = useState('')
  const [confirmPIN, setConfirmPIN] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ text: '', type: '' })
  const [cooldown, setCooldown] = useState(0)

  // --- สำหรับขอ Link ใหม่ ---
  const handleRequestLink = async (e) => {
    e.preventDefault()
    if (cooldown > 0) return
    
    setLoading(true)
    setMessage({ text: '', type: '' })
    
    const res = await requestRecovery(email)
    if (res.success) {
      setMessage({ text: res.message, type: 'success' })
      setCooldown(60)
      const timer = setInterval(() => {
        setCooldown(prev => {
          if (prev <= 1) {
            clearInterval(timer)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else {
      setMessage({ text: res.error, type: 'error' })
    }
    setLoading(false)
  }

  // --- สำหรับตั้ง PIN ใหม่ (เมื่อมี Token) ---
  const handleResetPIN = async (e) => {
    e.preventDefault()
    if (newPIN !== confirmPIN) {
      setMessage({ text: 'PIN ไม่ตรงกัน', type: 'error' })
      return
    }
    if (!/^\d{6}$/.test(newPIN)) {
      setMessage({ text: 'PIN ต้องเป็นตัวเลข 6 หลัก', type: 'error' })
      return
    }

    setLoading(true)
    const res = await resetPINWithToken({ token, newPIN })
    if (res.success) {
      setMessage({ text: '✅ เปลี่ยน PIN สำเร็จแล้ว! กำลังพากลับหน้าเข้าสู่ระบบ...', type: 'success' })
      setTimeout(() => router.push('/'), 3000)
    } else {
      setMessage({ text: res.error, type: 'error' })
    }
    setLoading(false)
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#0a0f16',
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      padding: '24px',
      fontFamily: 'inherit'
    }}>
      <div style={{ width: '100%', maxWidth: '400px', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#fff', marginBottom: '8px' }}>
            {token ? 'Set New PIN' : 'Reset Account'}
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '14px' }}>
            {token ? 'กำหนดรหัส PIN 6 หลักใหม่เพื่อเข้าใช้งาน' : 'ระบุอีเมลของคุณเพื่อรับลิงก์กู้คืน'}
          </p>
        </div>

        <div style={{ 
          background: 'rgba(255, 255, 255, 0.03)', 
          backdropFilter: 'blur(16px)',
          padding: '32px',
          borderRadius: '24px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
        }}>
          
          {message.text && (
            <div style={{ 
              color: message.type === 'success' ? '#10b981' : '#ef4444', 
              fontSize: '13px', 
              marginBottom: '24px',
              padding: '12px 16px',
              background: message.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              borderRadius: '12px',
              border: `1px solid ${message.type === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
            }}>
              {message.text}
            </div>
          )}

          {token ? (
            <form onSubmit={handleResetPIN} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>
                  New 6-Digit PIN
                </label>
                <input 
                  type="password" required maxLength={6}
                  value={newPIN} onChange={(e) => setNewPIN(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••••"
                  style={{ width: '100%', padding: '14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff', textAlign: 'center', fontSize: 24, letterSpacing: 8, outline: 'none' }}
                />
              </div>
              <div>
                <label style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>
                  Confirm New PIN
                </label>
                <input 
                  type="password" required maxLength={6}
                  value={confirmPIN} onChange={(e) => setConfirmPIN(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••••"
                  style={{ width: '100%', padding: '14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff', textAlign: 'center', fontSize: 24, letterSpacing: 8, outline: 'none' }}
                />
              </div>
              <button type="submit" disabled={loading} style={{ width: '100%', padding: '14px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 12, fontWeight: '700', cursor: 'pointer', marginTop: 10 }}>
                {loading ? 'Updating...' : 'Change PIN'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRequestLink} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>
                  Email Address
                </label>
                <input 
                  type="email" required
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@company.com"
                  style={{ width: '100%', padding: '14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff', outline: 'none' }}
                />
              </div>
              <button 
                type="submit" 
                disabled={loading || cooldown > 0}
                style={{ 
                  width: '100%', padding: '14px', 
                  background: (loading || cooldown > 0) ? '#1e293b' : '#1d4ed8', 
                  color: (loading || cooldown > 0) ? '#64748b' : '#fff', 
                  border: 'none', borderRadius: 12, fontWeight: '700', cursor: (loading || cooldown > 0) ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? 'Sending...' : cooldown > 0 ? `Resend Link (${cooldown}s)` : 'Send Recovery Link'}
              </button>
            </form>
          )}

          <div style={{ marginTop: '24px', textAlign: 'center' }}>
            <Link href="/" style={{ color: '#3b82f6', fontSize: '13px', textDecoration: 'none' }}>
              ← กลับไปหน้า Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ResetPinPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#0a0f16', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>Loading...</div>}>
      <ResetPinContent />
    </Suspense>
  )
}
