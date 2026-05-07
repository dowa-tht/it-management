'use client'
import { useState, useRef, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { unifiedLogin, getOnboardingStatus } from '@/app/actions/login'
import { requestPasswordOTP, verifyPasswordOTP } from '@/app/actions/recovery'
import { supabase } from '@/lib/supabase'

function LoginContent() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showRecovery, setShowRecovery] = useState(false)
  const [recoveryEmail, setRecoveryEmail] = useState('')
  const [recoveryLoading, setRecoveryLoading] = useState(false)
  const [recoveryMsg, setRecoveryMsg] = useState({ text: '', type: '' })
  const [recoveryStep, setRecoveryStep] = useState('email') // email, otp
  const [otpValue, setOtpValue] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const [loginCooldown, setLoginCooldown] = useState(0)
  const [clickCount, setClickCount] = useState(0)
  const [honeypot, setHoneypot] = useState('')
  const [isVerified, setIsVerified] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  // ตรวจสอบ Session — ให้ client-side จัดการ redirect เองเพื่อไม่ให้ขัดกับ Proxy
  useEffect(() => {
    const checkSession = async () => {
      const errorMsg = searchParams.get('error')
      if (errorMsg) return // มี error อยู่ให้แสดงก่อน ไม่ redirect

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return // ไม่มี session -> แสดงหน้า login ปกติ

      // มี session -> เช็คว่า onboard หรือยัง
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('is_onboarded, onboarding_token')
        .eq('id', session.user.id)
        .single()

      if (!profile) return

      if (profile.is_onboarded) {
        // Onboard แล้ว -> ไป Dashboard
        router.replace('/dashboard')
      } else {
        // ยังไม่ Onboard -> ใช้ full redirect ไป API เพื่อสร้าง/ดึง Token
        // (ใช้ window.location เพื่อให้ browser ส่ง cookie ครบถ้วน)
        window.location.href = '/api/onboarding/init'
      }
    }
    checkSession()
  }, [router, searchParams])

  // ดักจับ Error จาก URL (เช่น จากหน้า Gatekeeper)
  useEffect(() => {
    const errorMsg = searchParams.get('error')
    if (errorMsg) {
      setError(errorMsg)
    }
  }, [searchParams])

  // Timer สำหรับ Login Cooldown
  useEffect(() => {
    if (loginCooldown > 0) {
      const timer = setTimeout(() => setLoginCooldown(loginCooldown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [loginCooldown])

  const handleVerify = () => {
    setVerifying(true)
    // จำลองการ Scan ความปลอดภัยเหมือน Cloudflare
    setTimeout(() => {
      setIsVerified(true)
      setVerifying(false)
    }, 1500)
  }

  const handleMicrosoftLogin = async () => {
    if (!isVerified) return
    if (honeypot) return // Bot Trap
    if (loginCooldown > 0) return
    
    setLoading(true)
    setError('')

    // กำหนด Redirect URL ให้ถูกต้องตาม Environment
    // ถ้าอยู่บน Vercel ให้ใช้ค่าจาก window.location.origin ซึ่งควรเป็น URL ของ Vercel
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const redirectTo = `${origin}/auth/callback`;

    console.log('Redirecting to:', redirectTo);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'azure',
      options: {
        redirectTo: redirectTo,
        scopes: 'openid profile email'
      }
    })
    if (error) {
      setError(`Login failed: ${error.message}`)
      setLoading(false)
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!isVerified) return
    if (honeypot) return // Bot Trap
    if (loginCooldown > 0) return
    if (!email || !password) return

    // Anti-Spam Logic
    setClickCount(prev => prev + 1)
    if (clickCount >= 5) {
      setLoginCooldown(15)
      setClickCount(0)
      setError('ตรวจพบการกดปุ่มรัวเกินไป ระบบปิดกั้นชั่วคราว 15 วินาที')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await unifiedLogin(email, password)

      if (res.success) {
        if (res.needs_onboarding) {
          router.push('/onboarding')
        } else {
          router.push('/dashboard')
        }
      } else if (res.redirect_to_denied) {
        router.push('/access-denied')
      } else {
        setError(res.error || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง')
      }
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ')
    } finally {
      setLoading(false)
    }
  }

  const handleRecovery = async (e) => {
    e.preventDefault()
    if (cooldown > 0) return
    
    setRecoveryLoading(true)
    setRecoveryMsg({ text: '', type: '' })
    
    const res = await requestPasswordOTP(recoveryEmail || email)
    if (res.success) {
      setRecoveryMsg({ text: res.message, type: 'success' })
      setRecoveryStep('otp')
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
      setRecoveryMsg({ text: res.error, type: 'error' })
    }
    setRecoveryLoading(false)
  }

  const handleVerifyOTP = async (e) => {
    if (e) e.preventDefault()
    if (otpValue.length !== 6) return

    setRecoveryLoading(true)
    setRecoveryMsg({ text: '', type: '' })

    const res = await verifyPasswordOTP(recoveryEmail || email, otpValue)
    if (res.success) {
      router.push(`/reset-password?token=${res.token}`)
    } else {
      setRecoveryMsg({ text: res.error, type: 'error' })
      setOtpValue('')
    }
    setRecoveryLoading(false)
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
          <div style={{ background: 'rgba(220, 38, 38, 0.15)', color: '#f87171', padding: '16px', borderRadius: 16, fontSize: 13, marginBottom: 24, border: '1px solid rgba(220, 38, 38, 0.3)', display: 'flex', alignItems: 'center', gap: 12, lineHeight: 1.5 }}>
            <span style={{ fontSize: 20 }}>🚫</span>
            <div>{error}</div>
          </div>
        )}

        <div style={{ overflow: 'hidden', position: 'relative' }}>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Honeypot Field (Bot Trap) */}
            <div style={{ display: 'none' }} aria-hidden="true">
              <input type="text" value={honeypot} onChange={e => setHoneypot(e.target.value)} tabIndex="-1" autoComplete="off" />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email Address</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="name@example.com" required
                style={{ width: '100%', padding: '14px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff', fontSize: 15, outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" required
                  style={{ width: '100%', padding: '14px 44px 14px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff', fontSize: 15, outline: 'none' }}
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 4 }}
                >
                  {showPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.81l2.92 2.92c1.51-1.26 2.7-2.89 3.44-4.73-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/></svg>
                  )}
                </button>
              </div>
            </div>

            {/* Cloudflare Style Verification */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {!isVerified ? (
                  <div 
                    onClick={!verifying ? handleVerify : undefined} 
                    style={{ 
                      width: 24, height: 24, border: '2px solid #3b82f6', borderRadius: 4, 
                      cursor: verifying ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: verifying ? 'rgba(59,130,246,0.1)' : 'transparent'
                    }}
                  >
                    {verifying && <div style={{ width: 12, height: 12, border: '2px solid transparent', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />}
                  </div>
                ) : (
                  <div style={{ color: '#10b981', fontSize: 20 }}>✅</div>
                )}
                <span style={{ fontSize: 13, color: isVerified ? '#10b981' : '#94a3b8', fontWeight: 500 }}>
                  {verifying ? 'Verifying security...' : isVerified ? 'Success! You are human.' : 'I am human'}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', opacity: 0.4 }}>
                <div style={{ fontSize: 9, color: '#fff', fontWeight: 700 }}>DOWA IT</div>
                <div style={{ fontSize: 7, color: '#94a3b8' }}>Security Check</div>
              </div>
            </div>

            {isVerified && (
              <>
                <button 
                  type="submit" 
                  disabled={loading || loginCooldown > 0} 
                  style={{ 
                    width: '100%', padding: '14px', 
                    background: loginCooldown > 0 ? '#1e293b' : '#1d4ed8', 
                    color: loginCooldown > 0 ? '#475569' : '#fff', 
                    border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 600, 
                    cursor: (loading || loginCooldown > 0) ? 'not-allowed' : 'pointer', 
                    transition: 'all 0.2s', marginTop: 8 
                  }}
                >
                  {loading ? 'Authenticating...' : loginCooldown > 0 ? `Spam Protected (${loginCooldown}s)` : 'Sign In'}
                </button>

                <div style={{ textAlign: 'center' }}>
                  <button type="button" onClick={() => { setShowRecovery(true); setRecoveryEmail(email) }} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}>
                    Forgot Password?
                  </button>
                </div>

                {/* OR Divider */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '10px 0' }}>
                  <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
                  <span style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>OR</span>
                  <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
                </div>

                {/* Microsoft Login Button */}
                <button 
                  type="button"
                  onClick={handleMicrosoftLogin}
                  disabled={loading}
                  style={{ 
                    width: '100%', padding: '12px', background: '#fff', color: '#1e293b', 
                    border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700, 
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                    gap: 12, transition: 'all 0.2s', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' 
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                >
                  <svg width="20" height="20" viewBox="0 0 23 23"><path fill="#f35325" d="M1 1h10v10H1z"/><path fill="#81bc06" d="M12 1h10v10H12z"/><path fill="#05a6f0" d="M1 12h10v10H1z"/><path fill="#ffba08" d="M12 12h10v10H12z"/></svg>
                  Sign in with Microsoft
                </button>
              </>
            )}
          </form>
        </div>

        <div style={{ marginTop: 32, textAlign: 'center', fontSize: 11, color: '#475569' }}>
          DOWA IT System v2.1 · Unified Auth Architecture
        </div>
      </div>

      {/* Recovery Modal */}
      {showRecovery && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }}>
          <div style={{ background: '#131929', border: '1px solid #1e2d47', borderRadius: 24, padding: 40, width: '100%', maxWidth: 400, position: 'relative' }}>
            <button onClick={() => setShowRecovery(false)} style={{ position: 'absolute', right: 20, top: 20, background: 'none', border: 'none', color: '#94a3b8', fontSize: 24, cursor: 'pointer' }}>×</button>
            
            <h3 style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 8 }}>
              {recoveryStep === 'email' ? 'Recovery Account' : 'Verify OTP'}
            </h3>
            <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 24 }}>
              {recoveryStep === 'email' 
                ? 'ระบุอีเมลของคุณเพื่อรับรหัส OTP กู้คืนรหัสผ่าน' 
                : `กรุณากรอกรหัส OTP 6 หลักที่ส่งไปยัง ${recoveryEmail || email}`
              }
            </p>

            {recoveryMsg.text && (
              <div style={{ padding: '12px 16px', borderRadius: 12, fontSize: 13, marginBottom: 20, background: recoveryMsg.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: recoveryMsg.type === 'success' ? '#10b981' : '#ef4444', border: `1px solid ${recoveryMsg.type === 'success' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
                {recoveryMsg.text}
              </div>
            )}

            {recoveryStep === 'email' ? (
              <form onSubmit={handleRecovery} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>Email Address</label>
                  <input 
                    type="email" value={recoveryEmail} onChange={e => setRecoveryEmail(e.target.value)}
                    placeholder="name@example.com" required
                    style={{ width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#fff', fontSize: 14 }}
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={recoveryLoading || cooldown > 0}
                  style={{ 
                    width: '100%', padding: '14px', background: (recoveryLoading || cooldown > 0) ? '#1e293b' : '#1d4ed8', 
                    color: (recoveryLoading || cooldown > 0) ? '#64748b' : '#fff', border: 'none', borderRadius: 10, 
                    fontSize: 14, fontWeight: 600, cursor: (recoveryLoading || cooldown > 0) ? 'not-allowed' : 'pointer'
                  }}
                >
                  {recoveryLoading ? 'Sending...' : cooldown > 0 ? `ส่งรหัสอีกครั้งใน (${cooldown}s)` : 'ส่งรหัส OTP'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOTP} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: 8, display: 'block', textAlign: 'center' }}>Enter 6-Digit OTP</label>
                  <input 
                    type="text" value={otpValue} 
                    onChange={e => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 6)
                      setOtpValue(val)
                      if (val.length === 6) {
                        // Trigger verify automatically
                      }
                    }}
                    placeholder="••••••" required
                    style={{ width: '100%', padding: '16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#fff', fontSize: 28, letterSpacing: '8px', textAlign: 'center', outline: 'none' }}
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={recoveryLoading || otpValue.length !== 6}
                  style={{ 
                    width: '100%', padding: '14px', background: (recoveryLoading || otpValue.length !== 6) ? '#1e293b' : '#10b981', 
                    color: (recoveryLoading || otpValue.length !== 6) ? '#64748b' : '#fff', border: 'none', borderRadius: 10, 
                    fontSize: 14, fontWeight: 600, cursor: (recoveryLoading || otpValue.length !== 6) ? 'not-allowed' : 'pointer'
                  }}
                >
                  {recoveryLoading ? 'Verifying...' : 'Verify & Continue'}
                </button>
                <div style={{ textAlign: 'center' }}>
                  <button 
                    type="button" 
                    onClick={handleRecovery}
                    disabled={cooldown > 0}
                    style={{ background: 'none', border: 'none', color: cooldown > 0 ? '#475569' : '#3b82f6', fontSize: 12, cursor: cooldown > 0 ? 'not-allowed' : 'pointer' }}
                  >
                    {cooldown > 0 ? `Resend OTP in ${cooldown}s` : 'Resend OTP'}
                  </button>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <button 
                    type="button" 
                    onClick={() => { setRecoveryStep('email'); setOtpValue(''); setRecoveryMsg({ text: '', type: '' }); }}
                    style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 12, cursor: 'pointer' }}
                  >
                    Back to Email
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  )
}