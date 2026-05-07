'use client'
import { useState, useRef, useEffect } from 'react'
import SignaturePad from 'react-signature-canvas'
import { verifyMemberPIN, requestSignatureOTP, verifySignatureOTP } from '@/app/actions/users'

export function MemberSignatureModal({ isOpen, onConfirm, onCancel, memberName, memberId, loading }) {
  const [mode, setMode] = useState('pin') // 'pin' or 'otp'
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [attempts, setAttempts] = useState(5)
  const [isVerified, setIsVerified] = useState(false)
  const [otpLoading, setOtpLoading] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const sigPad = useRef(null)

  if (!isOpen) return null

  const handleVerify = async () => {
    if (code.length < 4) {
      setError(`กรุณากรอก ${mode === 'pin' ? 'PIN' : 'OTP'} ให้ครบถ้วน`)
      return
    }

    let res;
    if (mode === 'pin') {
      res = await verifyMemberPIN(memberId, code)
    } else {
      res = await verifySignatureOTP(memberId, code)
    }

    if (res.success) {
      setIsVerified(true)
      setError('')
    } else {
      if (mode === 'pin') {
        const newAttempts = attempts - 1
        setAttempts(newAttempts)
        if (newAttempts <= 0) {
          setError('บัญชีถูกล็อคชั่วคราวเนื่องจากใส่ PIN ผิดเกินกำหนด กรุณาติดต่อ IT')
        } else {
          setError(`PIN ไม่ถูกต้อง (เหลืออีก ${newAttempts} ครั้ง)`)
        }
      } else {
        setError(res.error || 'รหัส OTP ไม่ถูกต้อง')
      }
    }
  }

  const handleRequestOTP = async () => {
    setOtpLoading(true)
    setError('')
    // Fallback: ใช้ชื่อแทนถ้าไม่มี ID
    const res = await requestSignatureOTP(memberId || memberName)
    setOtpLoading(false)
    if (res.success) {
      setOtpSent(true)
      setMode('otp')
      setCode('')
      if (res.email) setUserEmail(res.email)
    } else {
      if (!memberId) {
        setError('MISSING_ID')
      } else {
        setError(res.error || 'ไม่สามารถส่ง OTP ได้')
      }
    }
  }

  const handleConfirmSignature = () => {
    if (sigPad.current.isEmpty()) {
      setError('กรุณาเซ็นชื่อในช่องว่าง')
      return
    }
    const signatureData = sigPad.current.toDataURL()
    onConfirm(signatureData)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 450, overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
        
        <div style={{ padding: '24px 24px 16px', borderBottom: '1px solid #f1f5f9' }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', margin: 0 }}>ยืนยันตัวตนผู้แจ้ง</h3>
          <p style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>ผู้เซ็นรับทราบ: <strong>{memberName}</strong></p>
        </div>

        <div style={{ padding: 24 }}>
          {!isVerified ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 20 }}>
                <button 
                  onClick={() => { setMode('pin'); setCode(''); setError(''); }}
                  style={{ padding: '6px 12px', borderRadius: 20, border: '1px solid #e2e8f0', fontSize: 11, fontWeight: 600, background: mode === 'pin' ? '#1e293b' : '#fff', color: mode === 'pin' ? '#fff' : '#64748b', cursor: 'pointer' }}
                >
                  ใช้ PIN
                </button>
                <button 
                  onClick={() => { setMode('otp'); setCode(''); setError(''); }}
                  style={{ padding: '6px 12px', borderRadius: 20, border: '1px solid #e2e8f0', fontSize: 11, fontWeight: 600, background: mode === 'otp' ? '#1e293b' : '#fff', color: mode === 'otp' ? '#fff' : '#64748b', cursor: 'pointer' }}
                >
                  ใช้ Email OTP
                </button>
              </div>

              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 16, textAlign: 'center' }}>
                {mode === 'pin' ? 'กรุณากรอกรหัส PIN 6 หลัก' : (otpSent ? `กรุณากรอกรหัส OTP ที่ส่งไปที่ ${userEmail}` : 'กรุณากรอกรหัส OTP จากอีเมลของคุณ')}
              </label>

              <input 
                type="password" 
                maxLength={6} 
                value={code} 
                onChange={e => {
                  setCode(e.target.value.replace(/\D/g, ''))
                  setError('')
                }}
                disabled={attempts <= 0 || otpLoading}
                placeholder="••••••"
                style={{ width: '100%', padding: '12px', border: '2px solid #e2e8f0', borderRadius: 12, fontSize: 32, letterSpacing: '8px', textAlign: 'center', fontFamily: 'inherit', outline: 'none', background: attempts <= 0 ? '#f3f4f6' : '#fff' }}
              />
              
              {mode === 'otp' && !otpSent && (
                <div style={{ marginTop: 12, textAlign: 'center' }}>
                  <button 
                    onClick={handleRequestOTP}
                    disabled={otpLoading}
                    style={{ background: 'none', border: 'none', color: '#1d4ed8', fontSize: 12, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    {otpLoading ? 'กำลังส่ง...' : '📩 ขอรหัส OTP ทางอีเมล'}
                  </button>
                </div>
              )}

              {otpSent && mode === 'otp' && (
                <div style={{ marginTop: 8, color: '#059669', fontSize: 11, textAlign: 'center' }}>
                  ✓ ส่งรหัส OTP เรียบร้อยแล้ว (โปรดเช็คอีเมล)
                </div>
              )}

              {error === 'MISSING_ID' ? (
                <div style={{ background:'rgba(239,68,68,0.05)', border:'1px solid rgba(239,68,68,0.1)', borderRadius:12, padding:16, marginBottom:20, marginTop:16 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10, color:'#dc2626', fontWeight:600, fontSize:14, marginBottom:4 }}>
                    ❌ ไม่พบ ID ผู้ใช้ในระบบ
                  </div>
                  <p style={{ margin:0, fontSize:13, color:'#7f1d1d', lineHeight:1.5 }}>
                    ดูเหมือนเคสนี้จะไม่มี ID ผู้แจ้งเชื่อมโยงอยู่ (อาจเป็นเคสเก่า) 
                    <br />
                    <strong>ระบบจะพยายามค้นหาจากชื่อ "{memberName}" แทนครับ</strong>
                    <br /><br />
                    <span style={{ fontSize:12, color:'#991b1b' }}>คำแนะนำ: หากกดขอ OTP ไม่สำเร็จ กรุณาไปที่หน้าแก้ไข Incident แล้วเลือกชื่อผู้แจ้งใหม่อีกครั้งและกด "บันทึก" ก่อนกลับมาเซ็นชื่อครับ</span>
                  </p>
                </div>
              ) : error && (
                <div style={{ marginTop: 12, padding: 12, background: '#fff1f2', borderRadius: 8, border: '1px solid #fecaca' }}>
                  <div style={{ color: '#dc2626', fontSize: 12, textAlign: 'center', fontWeight: 600 }}>❌ {error}</div>
                  {mode === 'otp' && error.includes('อีเมล') && (
                    <div style={{ fontSize: 10, color: '#991b1b', marginTop: 4, textAlign: 'center' }}>
                      <strong>ทางเลือก:</strong> หากไม่มีอีเมล ให้ IT ไปที่ Settings &gt; Users เพื่อตั้ง PIN ให้เขา แล้วเลือก "ใช้ PIN" แทนครับ
                    </div>
                  )}
                </div>
              )}
              
              <button 
                onClick={handleVerify}
                disabled={attempts <= 0 || code.length < 4 || loading || otpLoading}
                style={{ width: '100%', marginTop: 20, padding: '12px', borderRadius: 12, border: 'none', background: '#1d4ed8', color: '#fff', fontWeight: 700, cursor: 'pointer', opacity: (attempts <= 0 || code.length < 4) ? 0.5 : 1 }}
              >
                ยืนยันการระบุตัวตน
              </button>
            </>
          ) : (
            <>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 10 }}>วาดลายเซ็นต์ลงในช่องด้านล่าง</label>
              <div style={{ border: '2px dashed #1d4ed8', borderRadius: 12, background: '#f0f9ff', marginBottom: 20, position: 'relative' }}>
                <SignaturePad 
                  ref={sigPad}
                  canvasProps={{ width: 400, height: 200, className: 'sigCanvas' }}
                  penColor="#1e40af"
                />
                <button onClick={() => sigPad.current.clear()} style={{ position: 'absolute', right: 12, bottom: 12, padding: '4px 10px', fontSize: 11, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6, color: '#64748b' }}>ล้าง</button>
              </div>
              <button 
                onClick={handleConfirmSignature}
                style={{ width: '100%', padding: '12px', borderRadius: 12, border: 'none', background: '#059669', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
              >
                เสร็จสิ้นและบันทึกลายเซ็นต์
              </button>
            </>
          )}
        </div>

        <div style={{ padding: '16px 24px 24px', background: '#f8fafc', display: 'flex', justifyContent: 'center' }}>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}>ยกเลิกและปิดหน้าต่าง</button>
        </div>
      </div>

      <style jsx global>{`
        .sigCanvas {
          width: 100% !important;
          height: 200px !important;
        }
      `}</style>
    </div>
  )
}
