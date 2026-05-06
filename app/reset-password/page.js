'use client'
import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { resetPasswordWithToken } from '@/app/actions/recovery'

function ResetPasswordContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')
  
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ text: '', type: '' })

  const handleReset = async (e) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      setMessage({ text: 'รหัสผ่านไม่ตรงกัน', type: 'error' })
      return
    }
    if (newPassword.length < 8) {
      setMessage({ text: 'รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร', type: 'error' })
      return
    }

    setLoading(true)
    const res = await resetPasswordWithToken({ token, newPassword })
    if (res.success) {
      setMessage({ text: '✅ เปลี่ยนรหัสผ่านสำเร็จแล้ว! กำลังพากลับหน้าเข้าสู่ระบบ...', type: 'success' })
      setTimeout(() => router.push('/'), 3000)
    } else {
      setMessage({ text: res.error, type: 'error' })
    }
    setLoading(false)
  }

  if (!token) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0f16', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 20 }}>⚠️</div>
          <h2 style={{ color: '#fff', marginBottom: 10 }}>Link กู้คืนไม่ถูกต้อง</h2>
          <p style={{ marginBottom: 20 }}>กรุณาขอรหัส OTP ใหม่จากหน้า Login</p>
          <Link href="/" style={{ color: '#1d4ed8', textDecoration: 'none' }}>กลับหน้าแรก</Link>
        </div>
      </div>
    )
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
            Set New Password
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '14px' }}>
            กำหนดรหัสผ่านใหม่เพื่อเข้าใช้งานระบบ
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

          <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>
                New Password
              </label>
              <input 
                type="password" required
                value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                style={{ width: '100%', padding: '14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff', fontSize: 15, outline: 'none' }}
              />
            </div>
            <div>
              <label style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>
                Confirm New Password
              </label>
              <input 
                type="password" required
                value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                style={{ width: '100%', padding: '14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff', fontSize: 15, outline: 'none' }}
              />
            </div>
            <button type="submit" disabled={loading} style={{ width: '100%', padding: '14px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 12, fontWeight: '700', cursor: 'pointer', marginTop: 10 }}>
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>

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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#0a0f16', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>Loading...</div>}>
      <ResetPasswordContent />
    </Suspense>
  )
}
