import { useState, useRef, useEffect } from 'react'
import SignaturePad from 'react-signature-canvas'
import { requestSignaturePinReset } from '@/app/actions/user'

export function SignatureModal({ isOpen, onConfirm, onCancel, approverName, loading, userEmail, showPin = true }) {
  const [selectedApproverId, setSelectedApproverId] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [resetSent, setResetSent] = useState(false)
  const sigPad = useRef(null)

  if (!isOpen) return null

  const handleConfirm = async () => {
    if (showPin) {
      if (pin.length !== 6) {
        setError('กรุณากรอกรหัส PIN ให้ครบ 6 หลัก')
        return
      }
    }
    
    if (sigPad.current.isEmpty()) {
      setError('กรุณาเซ็นชื่อในช่องว่าง')
      return
    }

    const signatureData = sigPad.current.toDataURL()
    onConfirm(showPin ? pin : null, signatureData)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 450, overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
        <div style={{ padding: '24px 24px 16px', borderBottom: '1px solid #f1f5f9' }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', margin: 0 }}>ยืนยันตัวตนผู้อนุมัติ</h3>
          <p style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>ผู้อนุมัติ: <strong>{approverName}</strong></p>
        </div>

        <div style={{ padding: 24 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 10 }}>1. เซ็นชื่อลงในช่องว่างด้านล่าง</label>
          <div style={{ border: '2px dashed #e2e8f0', borderRadius: 12, background: '#f8fafc', marginBottom: 24, position: 'relative' }}>
            <SignaturePad 
              ref={sigPad}
              canvasProps={{ width: 400, height: 180, className: 'sigCanvas' }}
              penColor="#1e40af"
            />
            <button 
              onClick={() => sigPad.current.clear()}
              style={{ position: 'absolute', right: 12, bottom: 12, padding: '4px 10px', fontSize: 11, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer', color: '#64748b' }}
            >ล้างลายเซ็น</button>
          </div>

          {showPin && (
            <>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 10 }}>2. กรอกรหัส PIN 6 หลักของคุณ</label>
              <input 
                type="password" 
                maxLength={6} 
                value={pin} 
                onChange={e => {
                  setPin(e.target.value.replace(/\D/g, ''))
                  setError('')
                }}
                autoComplete="new-password"
                placeholder="••••••"
                style={{ width: '100%', padding: '12px', border: '2px solid #e2e8f0', borderRadius: 12, fontSize: 24, letterSpacing: '8px', textAlign: 'center', fontFamily: 'inherit', outline: 'none', transition: 'border-color 0.2s' }}
                onFocus={e => e.target.style.borderColor = '#3b82f6'}
                onBlur={e => e.target.style.borderColor = '#e2e8f0'}
              />

              <div style={{ textAlign: 'right', marginTop: 8 }}>
                {resetSent ? (
                  <span style={{ fontSize: 12, color: '#059669', fontWeight: 600 }}>📧 ส่งคำขอไปยังอีเมลของคุณแล้ว</span>
                ) : (
                  <button 
                    type="button" 
                    onClick={async () => {
                      if (userEmail) {
                        await requestSignaturePinReset(userEmail)
                        setResetSent(true)
                      } else {
                        setError('ไม่พบอีเมลผู้ใช้ กรุณาติดต่อ Admin')
                      }
                    }}
                    style={{ background: 'none', border: 'none', color: '#1d4ed8', fontSize: 12, cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                  >
                    ลืมรหัส PIN?
                  </button>
                )}
              </div>
            </>
          )}

          {error && <div style={{ marginTop: 12, color: '#dc2626', fontSize: 12, textAlign: 'center', fontWeight: 600 }}>❌ {error}</div>}
        </div>

        <div style={{ padding: '16px 24px 24px', background: '#f8fafc', display: 'flex', gap: 12 }}>
          <button 
            onClick={onCancel}
            disabled={loading}
            style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1px solid #e2e8f0', background: '#fff', color: '#475569', fontWeight: 600, cursor: 'pointer' }}
          >ยกเลิก</button>
          <button 
            onClick={handleConfirm}
            disabled={loading || (showPin && pin.length !== 6)}
            style={{ flex: 2, padding: '12px', borderRadius: 12, border: 'none', background: (!showPin || pin.length === 6) ? '#1d4ed8' : '#93c5fd', color: '#fff', fontWeight: 700, cursor: (!showPin || pin.length === 6) ? 'pointer' : 'not-allowed', boxShadow: (!showPin || pin.length === 6) ? '0 10px 15px -3px rgba(29, 78, 216, 0.3)' : 'none' }}
          >
            {loading ? 'กำลังตรวจสอบ...' : 'ยืนยันและอนุมัติงาน'}
          </button>
        </div>
      </div>
      <style jsx global>{`
        .sigCanvas {
          width: 100% !important;
          height: 180px !important;
          cursor: crosshair;
        }
      `}</style>
    </div>
  )
}
