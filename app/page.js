'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { checkUserTier, unifiedLogin } from '@/app/actions/auth'

export default function LoginPage() {
  const [step, setStep] = useState('email') // 'email' or 'auth'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pin, setPin] = useState(['', '', '', '', '', ''])
  const [tier, setTier] = useState(null) // 'internal' or 'external'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const pinRefs = [useRef(null), useRef(null), useRef(null), useRef(null), useRef(null), useRef(null)]

  const handleNext = async (e) => {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    setError('')
    
    try {
      const res = await checkUserTier(email)
      if (res.success && res.tier !== 'not_found') {
        setTier(res.tier)
        setStep('auth')
      } else {
        setError('ไม่พบอีเมลนี้ในระบบ หรือบัญชีถูกระงับการใช้งาน')
      }
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการตรวจสอบข้อมูล')
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async (e) => {
    e?.preventDefault()
    setLoading(true)
    setError('')

    try {
      const finalPass = tier === 'internal' ? password : pin.join('')
      const res = await unifiedLogin(email, finalPass)

      if (res.success) {
        router.push('/dashboard')
      } else {
        setError(res.error || 'การเข้าสู่ระบบล้มเหลว')
      }
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ')
    } finally {
      setLoading(false)
    }
  }

  const handlePinChange = (index, value) => {
    if (value.length > 1) value = value.slice(-1)
    const newPin = [...pin]
    newPin[index] = value
    setPin(newPin)

    if (value && index < 5) {
      pinRefs[index + 1].current?.focus()
    }
  }

  const handlePinKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      pinRefs[index - 1].current?.focus()
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#0a0f16',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px', fontFamily: 'inherit'
    }}>
      {/* Background Glow */}
      <div style={{ position: 'fixed', top: '20%', left: '30%', width: '400px', height: '400px', background: 'rgba(29, 78, 216, 0.15)', filter: 'blur(100px)', borderRadius: '50%', zIndex: 0 }} />
      
      <div style={{
        background: 'rgba(255, 255, 255, 0.03)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: 24, padding: '48px 40px',
        width: '100%', maxWidth: 420,
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
        zIndex: 1, position: 'relative'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>DOWA IT System</div>
          <p style={{ fontSize: 14, color: '#94a3b8', marginTop: 8 }}>Secure Access Management</p>
        </div>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '12px 16px', borderRadius: 12, fontSize: 13, marginBottom: 24, border: '1px solid rgba(239, 68, 68, 0.2)', textAlign: 'center' }}>
             {error}
          </div>
        )}

        <div style={{ overflow: 'hidden', position: 'relative' }}>
          {step === 'email' ? (
            <form onSubmit={handleNext} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email Address</label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="name@example.com" required
                  style={{ width: '100%', padding: '14px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff', fontSize: 15, outline: 'none' }}
                />
              </div>
              <button type="submit" disabled={loading} style={{ width: '100%', padding: '14px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>
                {loading ? 'Checking...' : 'Continue'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>
                    {tier === 'internal' ? 'Password' : 'Enter 6-Digit PIN'}
                  </label>
                  <button type="button" onClick={() => setStep('email')} style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: 12, cursor: 'pointer' }}>Change Email</button>
                </div>

                {tier === 'internal' ? (
                  <input
                    type="password" value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••" required autoFocus
                    style={{ width: '100%', padding: '14px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff', fontSize: 15, outline: 'none' }}
                  />
                ) : (
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                    {pin.map((digit, i) => (
                      <input
                        key={i} ref={pinRefs[i]} type="text" inputMode="numeric"
                        value={digit} onChange={e => handlePinChange(i, e.target.value)}
                        onKeyDown={e => handlePinKeyDown(i, e)}
                        style={{ width: 44, height: 56, textAlign: 'center', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff', fontSize: 20, fontWeight: 700, outline: 'none' }}
                      />
                    ))}
                  </div>
                )}
              </div>

              <button type="submit" disabled={loading} style={{ width: '100%', padding: '14px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
                {loading ? 'Authenticating...' : tier === 'internal' ? 'Sign In' : 'Access System'}
              </button>
            </form>
          )}
        </div>

        <div style={{ marginTop: 32, textAlign: 'center', fontSize: 11, color: '#475569' }}>
          DOWA IT System v2.0 · RBAC Protected Architecture
        </div>
      </div>
    </div>
  )
}