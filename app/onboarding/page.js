'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { validateOnboardingToken, completeOnboarding } from '@/app/actions/onboarding'

export default function OnboardingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [step, setStep] = useState(0) // 0: loading, 1: welcome, 2: password, 3: pin, 4: sso, 5: success
  const [user, setUser] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Form State
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pin, setPin] = useState('')
  const [isSSOConnected, setIsSSOConnected] = useState(false)

  useEffect(() => {
    async function checkToken() {
      // 1. เช็คก่อนว่ามี Session หรือยัง (กรณีตั้งค่าเสร็จแล้วกลับมาจาก SSO หรือโดน Force มาจาก Dashboard)
      const { supabase } = await import('@/lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session) {
        // ดึงโปรไฟล์มาเช็คว่า Onboard หรือยัง
        const { data: profile } = await supabase.from('user_profiles').select('*').eq('id', session.user.id).single()
        
        if (profile && !profile.is_onboarded) {
          // 🛡️ หากไม่มี Token ใน URL ให้เติมเข้าไปใหม่ (Self-healing) เพื่อให้ระบบมาตรฐาน Token ทำงานได้
          if (!token && profile.onboarding_token) {
            router.replace(`/onboarding?token=${profile.onboarding_token}`)
            return
          }

          setUser({ full_name: profile.full_name, email: profile.email })
          // ถ้าตั้งรหัสผ่านมาแล้ว (เช่นจาก Forgot Password) ให้ข้ามไป Step 3 (PIN) ได้เลย
          if (profile.force_password_change === false) {
            setStep(3)
          } else {
            setStep(2)
          }
          return
        } else if (profile && profile.is_onboarded) {
          // ถ้า Onboard แล้วแต่ยังเด้งมาหน้านี้ ให้เช็ค SSO (Step 4) หรือไป Dashboard
          setStep(4)
          return
        }
      }

      // 2. ถ้าไม่มี Session ค่อยเช็ค Token ตามปกติ
      if (!token) {
        setError('ไม่พบ Token สำหรับการลงทะเบียน หรือเซสชันหมดอายุ')
        setStep(-1)
        return
      }

      const res = await validateOnboardingToken(token)
      if (res.error) {
        setError(res.error)
        setStep(-1)
      } else {
        setUser(res.user)
        setStep(1)
      }
    }
    checkToken()
  }, [token])

  // ตรวจสอบสถานะ SSO เมื่ออยู่ Step 4
  useEffect(() => {
    if (step === 4) {
      const checkSSO = async () => {
        const { supabase } = await import('@/lib/supabase')
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const hasAzure = user.identities?.some(id => id.provider === 'azure')
          if (hasAzure) setIsSSOConnected(true)
        }
      }
      checkSSO()
    }
  }, [step])

  const validatePassword = (pass) => {
    const minLength = pass.length >= 8
    const hasUpper = /[A-Z]/.test(pass)
    const hasLower = /[a-z]/.test(pass)
    const hasNumber = /[0-9]/.test(pass)
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(pass)
    return { minLength, hasUpper, hasLower, hasNumber, hasSpecial }
  }

  const pwCheck = validatePassword(password)
  const isPasswordValid = Object.values(pwCheck).every(Boolean) && password === confirmPassword

  const handleComplete = async () => {
    setLoading(true)
    const res = await completeOnboarding({ token, password, pin })
    
    if (res.error) {
      setError(res.error)
      setLoading(false)
    } else {
      // 🚀 Auto-Login เพื่อให้สามารถทำ Link Identity (SSO) ได้ในหน้าถัดไป
      try {
        const { supabase } = await import('@/lib/supabase')
        const { error: loginError } = await supabase.auth.signInWithPassword({
          email: user.email,
          password: password
        })
        if (loginError) console.error('Auto-login failed:', loginError.message)
      } catch (err) {}
      
      setLoading(false)
      setStep(4) // Move to SSO step
    }
  }

  const handleLinkSSO = async () => {
    setLoading(true)
    try {
      const { supabase } = await import('@/lib/supabase')
      // เมื่อ Redirect กลับมา ให้มาที่ URL เดิมเพื่อให้ Onboarding ทำงานต่อได้
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'azure',
        options: {
          scopes: 'openid profile email',
          redirectTo: window.location.href
        }
      })
      if (error) throw error
    } catch (err) {
      setError(`SSO Error: ${err.message}`)
      setLoading(false)
    }
  }

  if (step === 0) return <div style={{ display:'flex', height:'100vh', alignItems:'center', justifyContent:'center', background:'#f8fafc', color:'#64748b' }}>กำลังตรวจสอบข้อมูล...</div>
  if (step === -1) return (
    <div style={{ display:'flex', height:'100vh', alignItems:'center', justifyContent:'center', background:'#f8fafc', padding:20 }}>
      <div style={{ background:'#fff', padding:40, borderRadius:24, boxShadow:'0 20px 25px -5px rgba(0,0,0,0.1)', maxWidth:400, textAlign:'center' }}>
        <div style={{ fontSize:48, marginBottom:20 }}>🛑</div>
        <h2 style={{ color:'#1e293b', marginBottom:12 }}>ลิงก์ไม่ถูกต้อง</h2>
        <p style={{ color:'#64748b', fontSize:14, lineHeight:1.6 }}>{error}</p>
        <button onClick={() => router.push('/')} style={{ marginTop:24, padding:'12px 24px', background:'#1d4ed8', color:'#fff', border:'none', borderRadius:12, fontWeight:600, cursor:'pointer' }}>กลับสู่หน้าหลัก</button>
      </div>
    </div>
  )

  const StepIndicator = () => (
    <div style={{ display:'flex', gap:8, marginBottom:32, justifyContent:'center' }}>
      {[1, 2, 3, 4].map(i => (
        <div key={i} style={{ width:i===step?32:12, height:12, borderRadius:6, background:i===step?'#1d4ed8':i<step?'#10b981':'#e2e8f0', transition:'all 0.3s' }} />
      ))}
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:'#f8fafc', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ width:'100%', maxWidth:500, background:'#fff', borderRadius:24, boxShadow:'0 25px 50px -12px rgba(0,0,0,0.1)', padding:40, position:'relative', overflow:'hidden' }}>
        
        {/* Step 1: Welcome */}
        {step === 1 && (
          <div className="fade-in">
            <div style={{ fontSize:40, marginBottom:24 }}>👋</div>
            <h1 style={{ fontSize:28, fontWeight:800, color:'#0f172a', marginBottom:12 }}>ยินดีต้อนรับสู่ DOWA IT</h1>
            <p style={{ color:'#64748b', fontSize:15, lineHeight:1.7, marginBottom:32 }}>
              สวัสดีคุณ <strong>{user.full_name}</strong> เพื่อความปลอดภัยในการใช้งานระบบ กรุณาดำเนินการตั้งค่าความปลอดภัยของบัญชีตามขั้นตอนใน Tour นี้ครับ
            </p>
            <StepIndicator />
            <button onClick={() => setStep(2)} style={{ width:'100%', padding:'16px', background:'#1d4ed8', color:'#fff', border:'none', borderRadius:14, fontWeight:700, fontSize:16, cursor:'pointer', boxShadow:'0 10px 15px -3px rgba(29, 78, 216, 0.3)' }}>เริ่มการตั้งค่า →</button>
          </div>
        )}

        {/* Step 2: Password Complexity */}
        {step === 2 && (
          <div className="fade-in">
            <h2 style={{ fontSize:22, fontWeight:800, color:'#0f172a', marginBottom:8 }}>ตั้งค่ารหัสผ่านใหม่</h2>
            <p style={{ color:'#64748b', fontSize:14, marginBottom:24 }}>รหัสผ่านต้องมีความปลอดภัยสูงตามเกณฑ์มาตรฐาน IT Audit</p>
            
            <div style={{ marginBottom:20 }}>
              <label style={{ fontSize:13, fontWeight:600, color:'#475569', display:'block', marginBottom:8 }}>New Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} style={{ width:'100%', padding:'14px', border:'2px solid #e2e8f0', borderRadius:12, outline:'none', focusBorderColor:'#1d4ed8' }} />
            </div>

            <div style={{ marginBottom:24 }}>
              <label style={{ fontSize:13, fontWeight:600, color:'#475569', display:'block', marginBottom:8 }}>Confirm New Password</label>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} style={{ width:'100%', padding:'14px', border:'2px solid #e2e8f0', borderRadius:12, outline:'none' }} />
            </div>

            <div style={{ background:'#f1f5f9', borderRadius:16, padding:20, marginBottom:32 }}>
              <div style={{ fontSize:12, fontWeight:700, color:'#475569', marginBottom:12, textTransform:'uppercase', letterSpacing:0.5 }}>เกณฑ์ความปลอดภัย:</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <CheckItem label="อย่างน้อย 8 ตัวอักษร" valid={pwCheck.minLength} />
                <CheckItem label="มีตัวพิมพ์ใหญ่ (A-Z)" valid={pwCheck.hasUpper} />
                <CheckItem label="มีตัวพิมพ์เล็ก (a-z)" valid={pwCheck.hasLower} />
                <CheckItem label="มีตัวเลข (0-9)" valid={pwCheck.hasNumber} />
                <CheckItem label="มีอักขระพิเศษ (!@#)" valid={pwCheck.hasSpecial} />
                <CheckItem label="รหัสผ่านตรงกัน" valid={password && password === confirmPassword} />
              </div>
            </div>

            <StepIndicator />
            <button 
              disabled={!isPasswordValid}
              onClick={() => setStep(3)} 
              style={{ width:'100%', padding:'16px', background:isPasswordValid ? '#1d4ed8' : '#cbd5e1', color:'#fff', border:'none', borderRadius:14, fontWeight:700, fontSize:16, cursor:isPasswordValid ? 'pointer' : 'not-allowed' }}
            >
              ถัดไป
            </button>
          </div>
        )}

        {/* Step 3: Signature PIN */}
        {step === 3 && (
          <div className="fade-in">
            <h2 style={{ fontSize:22, fontWeight:800, color:'#0f172a', marginBottom:8 }}>ตั้งรหัส Signature PIN</h2>
            <p style={{ color:'#64748b', fontSize:14, marginBottom:24 }}>รหัสตัวเลข 6 หลักสำหรับใช้เซ็นชื่อในเอกสาร (IT จะไม่ทราบรหัสนี้)</p>
            
            <div style={{ textAlign:'center', marginBottom:32 }}>
              <input 
                type="password" 
                maxLength={6} 
                value={pin} 
                onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••••"
                style={{ width:'100%', padding:'16px', border:'2px solid #e2e8f0', borderRadius:16, fontSize:40, letterSpacing:12, textAlign:'center', outline:'none' }}
              />
              {pin.length > 0 && pin.length < 6 && <div style={{ marginTop:12, color:'#d97706', fontSize:12 }}>กรุณากรอกให้ครบ 6 หลัก</div>}
            </div>

            <div style={{ background:'#fffbeb', border:'1px solid #fcd34d', borderRadius:16, padding:16, marginBottom:32 }}>
              <div style={{ fontSize:12, color:'#92400e', lineHeight:1.6 }}>
                <strong>⚠️ สำคัญ:</strong> PIN นี้เป็นความลับเฉพาะตัว ใช้ยืนยันตัวตนทางกฎหมายในระบบ ห้ามแจ้งรหัสนี้ให้ผู้อื่นทราบ
              </div>
            </div>

            <StepIndicator />
            <div style={{ display:'flex', gap:12 }}>
              <button onClick={() => setStep(2)} style={{ flex:1, padding:'16px', background:'#f1f5f9', color:'#475569', border:'none', borderRadius:14, fontWeight:700, cursor:'pointer' }}>ย้อนกลับ</button>
              <button 
                disabled={pin.length !== 6 || loading}
                onClick={handleComplete} 
                style={{ flex:2, padding:'16px', background:pin.length === 6 ? '#059669' : '#cbd5e1', color:'#fff', border:'none', borderRadius:14, fontWeight:700, fontSize:16, cursor:pin.length === 6 ? 'pointer' : 'not-allowed' }}
              >
                {loading ? 'กำลังบันทึก...' : 'บันทึกและถัดไป'}
              </button>
            </div>
            {error && <div style={{ marginTop:16, color:'#dc2626', fontSize:13, textAlign:'center' }}>❌ {error}</div>}
          </div>
        )}

        {/* Step 4: Link SSO */}
        {step === 4 && (
          <div className="fade-in">
            <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>
              {isSSOConnected ? '✨ เชื่อมต่อสำเร็จแล้ว' : 'เชื่อมต่อบัญชี Microsoft'}
            </h2>
            <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
              {isSSOConnected 
                ? 'บัญชีของคุณถูกผูกกับ Microsoft SSO เรียบร้อยแล้ว คุณสามารถใช้ปุ่ม "Sign in with Microsoft" ในการเข้าสู่ระบบครั้งถัดไป' 
                : 'เพิ่มความสะดวกในการเข้าใช้งานครั้งถัดไปโดยการเชื่อมต่อกับบัญชี Microsoft (SSO) ของคุณตามมาตรฐานบริษัท'}
            </p>

            <div style={{ 
              background: isSSOConnected ? '#f0fdf4' : '#f8fafc', 
              border: `1px solid ${isSSOConnected ? '#bcf0da' : '#e2e8f0'}`, 
              borderRadius: 20, padding: 24, textAlign: 'center', marginBottom: 32 
            }}>
              <div style={{ width: 48, height: 48, background: '#fff', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                {isSSOConnected ? (
                  <span style={{ fontSize: 24 }}>✅</span>
                ) : (
                  <svg viewBox="0 0 23 23" width="24" height="24"><path fill="#f3f3f3" d="M0 0h23v23H0z"/><path fill="#f35325" d="M1 1h10v10H1z"/><path fill="#81bc06" d="M12 1h10v10H12z"/><path fill="#05a6f0" d="M1 12h10v10H1z"/><path fill="#ffba08" d="M12 12h10v10H12z"/></svg>
                )}
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>
                {isSSOConnected ? 'Linked with Microsoft' : 'Microsoft Account'}
              </div>
              <div style={{ fontSize: 12, color: isSSOConnected ? '#16a34a' : '#94a3b8' }}>
                {isSSOConnected ? 'Authorized & Verified' : 'Connect via dowa-tht.co.th'}
              </div>
            </div>

            <StepIndicator />
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {!isSSOConnected ? (
                <>
                  <button 
                    onClick={handleLinkSSO}
                    disabled={loading}
                    style={{ width: '100%', padding: '16px', background: '#2f2f2f', color: '#fff', border: 'none', borderRadius: 14, fontWeight: 700, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
                  >
                    {loading ? 'กำลังเชื่อมต่อ...' : '🚀 เชื่อมต่อ Microsoft Account'}
                  </button>
                  <button 
                    onClick={() => setStep(5)}
                    style={{ width: '100%', padding: '16px', background: 'none', color: '#64748b', border: 'none', borderRadius: 14, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
                  >
                    ข้ามขั้นตอนนี้ (Skip)
                  </button>
                </>
              ) : (
                <button 
                  onClick={() => setStep(5)}
                  style={{ width: '100%', padding: '16px', background: '#059669', color: '#fff', border: 'none', borderRadius: 14, fontWeight: 700, fontSize: 16, cursor: 'pointer', boxShadow: '0 10px 15px -3px rgba(5, 150, 105, 0.3)' }}
                >
                  ถัดไป →
                </button>
              )}
            </div>
            {error && <div style={{ marginTop: 16, color: '#dc2626', fontSize: 13, textAlign: 'center' }}>❌ {error}</div>}
          </div>
        )}

        {/* Step 5: Success */}
        {step === 5 && (
          <div className="fade-in" style={{ textAlign:'center' }}>
            <div style={{ fontSize:64, marginBottom:24 }}>✨</div>
            <h2 style={{ fontSize:24, fontWeight:800, color:'#0f172a', marginBottom:12 }}>ตั้งค่าสำเร็จ!</h2>
            <p style={{ color:'#64748b', fontSize:14, lineHeight:1.6, marginBottom:32 }}>
              บัญชีของคุณพร้อมใช้งานแล้ว กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่เพื่อเริ่มใช้งาน
            </p>
            <button onClick={() => router.push('/')} style={{ width:'100%', padding:'16px', background:'#1d4ed8', color:'#fff', border:'none', borderRadius:14, fontWeight:700, fontSize:16, cursor:'pointer' }}>เข้าสู่ระบบตอนนี้ →</button>
          </div>
        )}

      </div>

      <style jsx>{`
        .fade-in {
          animation: fadeIn 0.4s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

function CheckItem({ label, valid }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
      <div style={{ width:16, height:16, borderRadius:'50%', background:valid?'#10b981':'#e2e8f0', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, color:'#fff' }}>
        {valid ? '✓' : ''}
      </div>
      <span style={{ fontSize:12, color:valid?'#0f172a':'#94a3b8' }}>{label}</span>
    </div>
  )
}
