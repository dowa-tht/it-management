'use client'
import { useState, useRef, useEffect } from 'react'
import SignaturePad from 'react-signature-canvas'
import { requestSignaturePinReset } from '@/app/actions/user'

const PIN_LENGTH = 6
const OTP_COOLDOWN_SECONDS = 60
const OTP_RESEND_LIMIT = 5

export function UnifiedApprovalModal({
  isOpen,
  onConfirm,
  onCancel,
  approverName,
  loading,
  userEmail,
  approverEmail,
  requirePin,
  title = 'ยืนยันการอนุมัติเอกสาร',
  isCreator = false,
  isRemote = false,
  onTestPin = null,
  verificationMode = 'pin',
  onRequestOtp = null,
  onVerifyCode = null,
  identityHint = '',
  targetEmail = null,
  targetEmailLabel = null,
}) {
  const needPin = requirePin !== undefined ? requirePin : isRemote
  const useTwoStepRemote = isRemote && !isCreator
  const [activeVerificationMode, setActiveVerificationMode] = useState(verificationMode)

  const [pin, setPin] = useState('')
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')
  const [pinTestResult, setPinTestResult] = useState(null)
  const [testingPin, setTestingPin] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [step, setStep] = useState('verify')
  const [identityVerified, setIdentityVerified] = useState(false)
  const [otpCooldownLeft, setOtpCooldownLeft] = useState(0)
  const [otpResendCount, setOtpResendCount] = useState(0)

  const sigPad = useRef(null)
  const [hasSigned, setHasSigned] = useState(false)

  useEffect(() => {
    if (otpCooldownLeft <= 0 || !isOpen) return
    const timer = setInterval(() => {
      setOtpCooldownLeft((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [otpCooldownLeft, isOpen])

  useEffect(() => {
    if (isOpen) {
      queueMicrotask(() => {
        setActiveVerificationMode(verificationMode)
        setPin('')
        setComment('')
        setError('')
        setPinTestResult(null)
        setTestingPin(false)
        setResetSent(false)
        setHasSigned(false)
        setStep('verify')
        setIdentityVerified(false)
        setOtpCooldownLeft(0)
        setOtpResendCount(0)
      })
    }
  }, [isOpen, verificationMode])

  if (!isOpen) return null

  const isOtpMode = activeVerificationMode === 'otp'

  const hasRealSignature = () => {
    if (!sigPad.current || sigPad.current.isEmpty()) return false
    const strokes = sigPad.current.toData()
    if (!Array.isArray(strokes) || strokes.length === 0) return false
    return strokes.some((stroke) => {
      if (Array.isArray(stroke)) return stroke.length > 1
      if (Array.isArray(stroke?.points)) return stroke.points.length > 1
      return false
    })
  }

  const verifyIdentity = async () => {
    if (!needPin) {
      setIdentityVerified(true)
      if (useTwoStepRemote) setStep('sign')
      return
    }

    if (pin.length !== PIN_LENGTH) {
      setError(isOtpMode ? 'กรุณากรอกรหัส OTP ให้ครบ 6 หลัก' : 'กรุณากรอกรหัส PIN ให้ครบ 6 หลัก')
      return
    }

    setError('')

    if (typeof onVerifyCode === 'function') {
      const result = await onVerifyCode({ mode: isOtpMode ? 'otp' : 'pin', code: pin })
      if (!result?.success) {
        setError(result?.message || (isOtpMode ? 'รหัส OTP ไม่ถูกต้องหรือหมดอายุ' : 'รหัส PIN ไม่ถูกต้อง'))
        return
      }
    } else if (!isOtpMode && typeof onTestPin === 'function') {
      setTestingPin(true)
      const result = await onTestPin(pin)
      setTestingPin(false)
      setPinTestResult(result)
      if (!result?.success) {
        setError(result?.message || 'รหัส PIN ไม่ถูกต้อง')
        return
      }
    }

    setIdentityVerified(true)
    if (useTwoStepRemote) setStep('sign')
  }

  const handleConfirm = async () => {
    if (isCreator) {
      onConfirm({ pin: null, otp: null, signatureData: null, comment })
      return
    }

    if (useTwoStepRemote && step === 'verify') {
      await verifyIdentity()
      return
    }

    if (needPin && pin.length !== PIN_LENGTH) {
      setError(isOtpMode ? 'กรุณากรอกรหัส OTP ให้ครบ 6 หลัก' : 'กรุณากรอกรหัส PIN ให้ครบ 6 หลัก')
      return
    }

    if (isRemote && !hasRealSignature()) {
      setError('กรุณาเซ็นชื่อให้เป็นลายเซ็นที่สมบูรณ์')
      return
    }

    const signatureData = sigPad.current ? sigPad.current.toDataURL() : null
    onConfirm({
      pin: needPin && activeVerificationMode !== 'otp' ? pin : null,
      otp: needPin && activeVerificationMode === 'otp' ? pin : null,
      signatureData,
      comment,
    })
  }

  const handleTestPin = async () => {
    if (!onTestPin) return
    if (pin.length !== PIN_LENGTH) {
      setError('กรุณากรอกรหัส PIN ให้ครบ 6 หลักก่อนทดสอบ')
      return
    }

    setTestingPin(true)
    setError('')
    setPinTestResult(null)
    const result = await onTestPin(pin)
    setPinTestResult(result)
    setTestingPin(false)
  }

  const requestOtp = async () => {
    if (!onRequestOtp) return { success: false }
    if (otpCooldownLeft > 0) {
      setError(`ส่งรหัส OTP ใหม่ได้อีกครั้งใน ${otpCooldownLeft} วินาที`)
      return { success: false }
    }
    if (otpResendCount >= OTP_RESEND_LIMIT) {
      setError(`คุณส่ง OTP ครบจำนวนสูงสุดแล้ว (${OTP_RESEND_LIMIT} ครั้ง)`)
      return { success: false }
    }

    setError('')
    const result = await onRequestOtp()
    if (!result?.success) {
      setError(result?.message || 'ไม่สามารถส่ง OTP ได้')
      return { success: false }
    }

    setOtpResendCount((prev) => prev + 1)
    setOtpCooldownLeft(OTP_COOLDOWN_SECONDS)
    return { success: true }
  }

  const switchToOtpMode = async () => {
    if (!onRequestOtp) {
      setError('ไม่สามารถส่ง OTP ได้ กรุณาติดต่อผู้ดูแลระบบ')
      return
    }
    const result = await requestOtp()
    if (result?.success === false) return
    setActiveVerificationMode('otp')
    setPin('')
    setPinTestResult(null)
    setError('')
  }

  const canConfirm = (() => {
    if (isCreator) return true
    if (!useTwoStepRemote) {
      return isRemote ? (!needPin || pin.length === PIN_LENGTH) && hasSigned : true
    }
    if (step === 'verify') {
      return !needPin || pin.length === PIN_LENGTH
    }
    return identityVerified && hasSigned
  })()

  const identityLabel = isRemote ? `ยืนยันตัวตนด้วย ${isOtpMode ? 'OTP' : 'PIN'} ของผู้อนุมัติ` : 'ผู้อนุมัติ (Login)'
  const displayName = approverName || 'ไม่พบชื่อผู้อนุมัติ'
  const displayEmail = targetEmail || approverEmail || userEmail || 'ไม่พบอีเมลผู้อนุมัติ'
  const displayEmailLabel = targetEmailLabel ? ` (${targetEmailLabel})` : ''
  const showVerifyStep = !useTwoStepRemote || step === 'verify'
  const showSignStep = !useTwoStepRemote || step === 'sign'

  const S = {
    overlay: { position: 'fixed', inset: 0, zIndex: 2000, background: 'radial-gradient(circle at 20% 10%, rgba(30,64,175,0.18), transparent 45%), rgba(2,6,23,0.58)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 },
    card: { width: '100%', maxWidth: 620, maxHeight: '90vh', overflowY: 'auto', borderRadius: 14, border: '1px solid #e2e8f0', background: '#fff', boxShadow: '0 28px 64px -34px rgba(15,23,42,0.45)' },
    header: { position: 'sticky', top: 0, zIndex: 1, borderBottom: '1px solid #dbe4f1', background: 'linear-gradient(180deg, #f8fbff 0%, #f3f8ff 100%)', backdropFilter: 'blur(3px)', padding: '12px 14px' },
    tag: { marginBottom: 8, display: 'inline-flex', alignItems: 'center', gap: 4, borderRadius: 999, background: 'linear-gradient(135deg,#dbeafe 0%,#cffafe 100%)', color: '#1d4ed8', padding: '4px 10px', fontSize: 10, fontWeight: 700, letterSpacing: 0.3, textTransform: 'uppercase', border: '1px solid #bfdbfe' },
    title: { fontSize: 24, fontWeight: 800, lineHeight: 1.12, color: '#0f172a', margin: 0 },
    subtitle: { marginTop: 4, fontSize: 11, color: '#475569', fontWeight: 500 },
    closeBtn: { width: 32, height: 32, borderRadius: 9, border: '1px solid #cbd5e1', background: '#fff', color: '#64748b', fontSize: 22, lineHeight: 1, cursor: 'pointer' },
    identityBox: { marginTop: 8, borderRadius: 10, border: '1px solid #dbe4f1', background: 'linear-gradient(135deg,#ffffff 0%,#f8fbff 100%)', padding: '8px 10px' },
    body: { display: 'flex', flexDirection: 'column', gap: 10, padding: 14 },
    section: { border: '1px solid #dbe4f1', background: '#fff', borderRadius: 10, padding: 10, boxShadow: '0 8px 20px -18px rgba(30,41,59,0.3)' },
    label: { fontSize: 11, fontWeight: 800, letterSpacing: 0.2, textTransform: 'uppercase', color: '#1e293b' },
    helper: { margin: '2px 0 0 0', fontSize: 11, color: '#64748b' },
    linkBtn: { fontSize: 11, fontWeight: 600, color: '#1d4ed8', background: 'linear-gradient(135deg,#eff6ff 0%,#ecfeff 100%)', border: '1px solid #bfdbfe', borderRadius: 8, padding: '6px 10px', cursor: 'pointer' },
    pinInput: { width: '100%', height: 48, borderRadius: 10, border: '1px solid #c7d2fe', background: '#fff', padding: '0 60px 0 14px', fontSize: 24, fontWeight: 700, letterSpacing: '0.28em', textAlign: 'center', color: '#0f172a', outline: 'none', boxShadow: 'inset 0 1px 2px rgba(15,23,42,0.04)' },
    signBox: { marginTop: 10, borderRadius: 12, border: '1px solid #c7d2fe', background: 'linear-gradient(180deg,#f8fbff 0%,#f1f5ff 100%)', position: 'relative', overflow: 'hidden' },
    footer: { borderTop: '1px solid #dbe4f1', background: 'linear-gradient(180deg,#f8fbff 0%,#f2f7ff 100%)', padding: '10px 14px' },
    cancel: { flex: 1, height: 40, borderRadius: 10, border: '1px solid #cbd5e1', background: '#fff', color: '#334155', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
    primary: (enabled) => ({ flex: 1, height: 40, borderRadius: 10, border: enabled ? '1px solid #1d4ed8' : '1px solid #cbd5e1', background: enabled ? 'linear-gradient(135deg,#2563eb 0%,#0891b2 100%)' : '#cbd5e1', color: enabled ? '#fff' : '#64748b', fontSize: 14, fontWeight: 700, cursor: enabled ? 'pointer' : 'not-allowed' }),
    err: { borderRadius: 10, border: '1px solid #fecaca', background: '#fef2f2', padding: '7px 9px', color: '#b91c1c', fontSize: 11, fontWeight: 600 },
    muted: { fontSize: 10, color: '#64748b', textAlign: 'center' },
  }

  return (
    <div style={S.overlay}>
      <div style={S.card}>
        <div style={S.header}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              {isRemote && <div style={S.tag}>Remote Approve</div>}
              <h3 style={S.title}>{title}</h3>
              <p style={S.subtitle}>{identityLabel}</p>
            </div>
            <button onClick={onCancel} aria-label="Close approval modal" style={S.closeBtn}>&times;</button>
          </div>
          <div style={S.identityBox}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{displayName}</p>
            <p style={{ margin: '2px 0 0 0', fontSize: 11, color: '#64748b' }}>{displayEmail}{displayEmailLabel}</p>
            {identityHint && <p style={{ margin: '4px 0 0 0', fontSize: 10, fontWeight: 600, color: '#1d4ed8' }}>{identityHint}</p>}
          </div>
        </div>

        <div style={S.body}>
          {showSignStep && !isCreator && isRemote && (
            <section style={S.section}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 10 }}>
                <label style={S.label}>เซ็นชื่อในกล่องด้านล่าง</label>
                <button onClick={() => { sigPad.current.clear(); setHasSigned(false) }} style={{ fontSize: 12, fontWeight: 600, color: '#64748b', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                  ล้างลายเซ็น
                </button>
              </div>
              <div style={S.signBox}>
                {!hasSigned && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', color: '#94a3b8', gap: 4 }}>
                    <span style={{ fontSize: 20 }}>✍️</span>
                    <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: 0.2, textTransform: 'uppercase' }}>วาดลายเซ็นที่นี่</span>
                  </div>
                )}
                <SignaturePad
                  ref={sigPad}
                  onBegin={() => setHasSigned(true)}
                  canvasProps={{ style: { width: '100%', height: 112, cursor: 'crosshair', display: 'block' } }}
                  penColor="#1e40af"
                />
              </div>
            </section>
          )}

          {showVerifyStep && !isCreator && needPin && (
            <section style={S.section}>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                <div>
                  <label htmlFor="approval-pin" style={S.label}>{isOtpMode ? 'ยืนยันด้วยรหัส OTP ของผู้อนุมัติ' : 'ยืนยันด้วยรหัส PIN ของผู้อนุมัติ'}</label>
                  <p style={S.helper}>{isOtpMode ? 'กรอก OTP 6 หลักจากอีเมลผู้อนุมัติเพื่อยืนยันตัวตน' : 'กรอก PIN 6 หลักของผู้อนุมัติเพื่อยืนยันตัวตน'}</p>
                </div>
                {isOtpMode ? (
                  <button
                    type="button"
                    onClick={requestOtp}
                    disabled={otpCooldownLeft > 0 || otpResendCount >= OTP_RESEND_LIMIT}
                    style={{ ...S.linkBtn, opacity: (otpCooldownLeft > 0 || otpResendCount >= OTP_RESEND_LIMIT) ? 0.5 : 1, cursor: (otpCooldownLeft > 0 || otpResendCount >= OTP_RESEND_LIMIT) ? 'not-allowed' : 'pointer' }}
                  >
                    {otpCooldownLeft > 0
                      ? `ส่งใหม่ใน ${otpCooldownLeft}s`
                      : otpResendCount >= OTP_RESEND_LIMIT
                        ? 'ครบจำนวนส่งแล้ว'
                        : 'ขอ OTP ทางอีเมล'}
                  </button>
                ) : (isRemote && typeof onRequestOtp === 'function') ? (
                  <button type="button" onClick={switchToOtpMode} style={S.linkBtn}>ลืมรหัส PIN?</button>
                ) : resetSent ? (
                  <span style={{ fontSize: 11, color: '#047857', fontWeight: 700, border: '1px solid #a7f3d0', borderRadius: 8, background: '#ecfdf5', padding: '6px 10px' }}>✅ ส่งคำขอแล้ว</span>
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
                    style={S.linkBtn}
                  >
                    ลืมรหัส PIN?
                  </button>
                )}
              </div>

              {isOtpMode && <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500, marginTop: 6 }}>ส่ง OTP แล้ว {otpResendCount}/{OTP_RESEND_LIMIT} ครั้ง</div>}

              <div style={{ position: 'relative', marginTop: 8 }}>
                <input
                  id="approval-pin"
                  type="password"
                  pattern="\d*"
                  inputMode="numeric"
                  maxLength={PIN_LENGTH}
                  value={pin}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, PIN_LENGTH)
                    setPin(val)
                    setError('')
                    setPinTestResult(null)
                  }}
                  placeholder="••••••"
                  style={S.pinInput}
                  autoFocus={showVerifyStep}
                  autoComplete="one-time-code"
                  aria-describedby="approval-pin-progress"
                />
                <div id="approval-pin-progress" style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', borderRadius: 999, background: '#f1f5f9', padding: '3px 8px', fontSize: 10, color: '#64748b', fontWeight: 600, pointerEvents: 'none' }}>
                  {pin.length}/{PIN_LENGTH}
                </div>
              </div>

              {onTestPin && !isOtpMode && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                  <button
                    type="button"
                    onClick={handleTestPin}
                    disabled={testingPin || pin.length !== PIN_LENGTH}
                    style={{ height: 34, borderRadius: 8, border: '1px solid #bfdbfe', background: '#eff6ff', color: '#1d4ed8', fontSize: 11, fontWeight: 700, cursor: (testingPin || pin.length !== PIN_LENGTH) ? 'not-allowed' : 'pointer', opacity: (testingPin || pin.length !== PIN_LENGTH) ? 0.5 : 1 }}
                  >
                    {testingPin ? 'กำลังทดสอบ PIN...' : 'ทดสอบ PIN ก่อนอนุมัติ'}
                  </button>
                  {pinTestResult && (
                    <div style={{ padding: 10, borderRadius: 10, fontSize: 12, fontWeight: 700, textAlign: 'center', border: pinTestResult.success ? '1px solid #a7f3d0' : '1px solid #fecaca', background: pinTestResult.success ? '#ecfdf5' : '#fef2f2', color: pinTestResult.success ? '#047857' : '#b91c1c' }}>
                      {pinTestResult.success ? '✅' : '⚠️'} {pinTestResult.message}
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {!useTwoStepRemote && (
            <section style={S.section}>
              <label style={S.label}>ความเห็นเพิ่มเติม (ถ้ามี)</label>
              <textarea
                rows={isCreator ? 5 : 2}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="ระบุความเห็น..."
                style={{ width: '100%', borderRadius: 10, border: '1px solid #cbd5e1', background: '#fff', outline: 'none', fontSize: 14, fontWeight: 500, minHeight: isCreator ? 140 : 80, lineHeight: 1.5, padding: '16px 20px', marginTop: 8, resize: 'none' }}
              />
            </section>
          )}

          {error && <div style={S.err} className="animate-shake">{error}</div>}
        </div>

        <div style={S.footer}>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={useTwoStepRemote && step === 'sign' ? () => setStep('verify') : onCancel}
              disabled={loading}
              style={{ ...S.cancel, opacity: loading ? 0.5 : 1 }}
            >
              {useTwoStepRemote && step === 'sign' ? 'ย้อนกลับ' : 'ยกเลิก'}
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading || !canConfirm || testingPin}
              style={S.primary(Boolean(canConfirm && !loading && !testingPin))}
            >
              {loading
                ? 'กำลังบันทึก...'
                : useTwoStepRemote && step === 'verify'
                  ? 'ยืนยัน'
                  : 'Approve'}
            </button>
          </div>

          {!loading && !canConfirm && !isCreator && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 8 }}>
              <span style={S.muted}>
                {useTwoStepRemote
                  ? step === 'verify'
                    ? (isOtpMode ? 'กรุณาระบุ OTP ให้ครบถ้วน' : 'กรุณาระบุ PIN ให้ครบถ้วน')
                    : 'กรุณาเซ็นชื่อให้เป็นลายเซ็นที่สมบูรณ์'
                  : isOtpMode
                    ? 'กรุณาเซ็นชื่อและระบุ OTP ให้ครบถ้วน'
                    : 'กรุณาเซ็นชื่อและระบุ PIN ให้ครบถ้วน'}
              </span>
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake { animation: shake 0.2s ease-in-out 0s 2; }
      `}</style>
    </div>
  )
}
