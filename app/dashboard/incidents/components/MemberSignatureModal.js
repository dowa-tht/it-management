'use client'
import { useState, useRef, useEffect } from 'react'
import SignaturePad from 'react-signature-canvas'
import { verifyMemberPIN } from '@/app/actions/users'

export function MemberSignatureModal({ isOpen, onConfirm, onCancel, memberName, memberId, loading }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [attempts, setAttempts] = useState(5)
  const [isVerified, setIsVerified] = useState(false)
  const sigPad = useRef(null)

  if (!isOpen) return null

  const handleVerifyPIN = async () => {
    if (pin.length < 4) {
      setError('กรุณากรอก PIN ให้ครบถ้วน')
      return
    }

    const res = await verifyMemberPIN(memberId, pin)
    if (res.success) {
      setIsVerified(true)
      setError('')
    } else {
      const newAttempts = attempts - 1
      setAttempts(newAttempts)
      if (newAttempts <= 0) {
        setError('บัญชีถูกล็อคชั่วคราวเนื่องจากใส่ PIN ผิดเกินกำหนด กรุณาติดต่อ IT')
      } else {
        setError(`PIN ไม่ถูกต้อง (เหลืออีก ${newAttempts} ครั้ง)`)
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
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 16, textAlign: 'center' }}>กรุณากรอกรหัส PIN ของคุณเพื่อเริ่มลงนาม</label>
              <input 
                type="password" 
                maxLength={6} 
                value={pin} 
                onChange={e => {
                  setPin(e.target.value.replace(/\D/g, ''))
                  setError('')
                }}
                disabled={attempts <= 0}
                placeholder="••••••"
                style={{ width: '100%', padding: '12px', border: '2px solid #e2e8f0', borderRadius: 12, fontSize: 32, letterSpacing: '8px', textAlign: 'center', fontFamily: 'inherit', outline: 'none', background: attempts <= 0 ? '#f3f4f6' : '#fff' }}
              />
              {error && <div style={{ marginTop: 12, color: '#dc2626', fontSize: 12, textAlign: 'center', fontWeight: 600 }}>❌ {error}</div>}
              <button 
                onClick={handleVerifyPIN}
                disabled={attempts <= 0 || pin.length < 4 || loading}
                style={{ width: '100%', marginTop: 20, padding: '12px', borderRadius: 12, border: 'none', background: '#1d4ed8', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
              >
                ยืนยัน PIN
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
