'use client'
import { useState, useRef, useEffect } from 'react'
import SignaturePad from 'react-signature-canvas'
import { requestSignaturePinReset } from '@/app/actions/user'

const PIN_LENGTH = 6

/**
 * 🔒 UnifiedApprovalModal (Unified Component)
 * Premium modal for signing and approving documents.
 * Supports: Signature Canvas, PIN Verification, and Comments.
 */
export function UnifiedApprovalModal({
  isOpen,
  onConfirm,
  onCancel,
  approverName,
  loading,
  userEmail,
  approverEmail,
  requirePin = true,
  title = "ยืนยันการอนุมัติเอกสาร",
  isCreator = false,
  isRemote = false,
  onTestPin = null
}) {
  const [pin, setPin] = useState('')
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')
  const [pinTestResult, setPinTestResult] = useState(null)
  const [testingPin, setTestingPin] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const sigPad = useRef(null)

  const [hasSigned, setHasSigned] = useState(false)
 
  useEffect(() => {
    if (isOpen) {
      queueMicrotask(() => {
        setPin('')
        setComment('')
        setError('')
        setPinTestResult(null)
        setTestingPin(false)
        setResetSent(false)
        setHasSigned(false)
      })
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleConfirm = async () => {
    // Creator self-approval: only comment is needed
    if (isCreator) {
      onConfirm({
        pin: null,
        signatureData: null,
        comment
      })
      return
    }

    if (requirePin && pin.length !== PIN_LENGTH) {
      setError('กรุณากรอกรหัส PIN ให้ครบ 6 หลัก')
      return
    }
    
    if (sigPad.current && sigPad.current.isEmpty()) {
      setError('กรุณาเซ็นชื่อในช่องว่าง')
      return
    }

    const signatureData = sigPad.current ? sigPad.current.toDataURL() : null
    onConfirm({
      pin: requirePin ? pin : null,
      signatureData,
      comment
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

  // Determine if confirm button should be enabled
  const canConfirm = isCreator ? true : (!requirePin || pin.length === PIN_LENGTH) && hasSigned
  const identityLabel = isRemote ? 'ต้องการลายเซ็น / PIN ของ' : 'ผู้อนุมัติ'
  const displayName = approverName || 'ไม่พบชื่อผู้อนุมัติ'
  const displayEmail = approverEmail || userEmail || 'ไม่พบอีเมลผู้อนุมัติ'

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl flex items-center justify-center z-[2000] p-3 sm:p-4 animate-in fade-in duration-500">
      <div
        className="bg-white rounded-[1.5rem] sm:rounded-3xl w-full max-w-xl max-h-[94vh] overflow-y-auto shadow-[0_20px_60px_-15px_rgba(15,23,42,0.5)] animate-in zoom-in-95 duration-500 scrollbar-hide border border-white/40 flex flex-col"
      >
        {/* Header Section */}
        <div className="relative overflow-hidden rounded-t-[1.5rem] sm:rounded-t-3xl bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 text-white shrink-0" style={{ padding: '24px 24px 20px 24px' }}>
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-xl pointer-events-none" />
          <div className="absolute -bottom-16 left-10 h-32 w-32 rounded-full bg-cyan-300/20 blur-2xl pointer-events-none" />
          
          <div className="relative flex justify-between gap-4 items-start z-10" style={{ width: '100%' }}>
            <div style={{ flex: 1, minWidth: 0, paddingRight: '12px' }}>
              {isRemote && (
                <div style={{ marginBottom: '8px', display: 'inline-flex', alignItems: 'center', gap: '4px', borderRadius: '9999px', border: '1px solid rgba(253, 224, 71, 0.4)', background: 'linear-gradient(to right, rgba(234, 179, 8, 0.2), rgba(249, 115, 22, 0.2))', padding: '2px 10px', fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#fef08a', boxShadow: '0 0 10px rgba(234, 179, 8, 0.15)' }}>
                  <span style={{ color: '#facc15' }}>⚡</span> Remote Approval
                </div>
              )}
              <h3 style={{ fontSize: '20px', fontWeight: 900, letterSpacing: '-0.01em', lineHeight: 1.2, margin: '0 0 12px 0' }}>{title}</h3>
              
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.12)', padding: '8px 10px', backdropFilter: 'blur(4px)', border: '1px solid rgba(255, 255, 255, 0.15)', maxWidth: '100%' }}>
                <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: '#fff', color: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '11px', flexShrink: 0 }}>
                  {displayName?.charAt(0).toUpperCase()}
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#dbeafe', lineHeight: 1, margin: '0 0 3px 0' }}>{identityLabel}</p>
                  <p style={{ fontSize: '12px', fontWeight: 900, color: '#fff', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: '0 0 2px 0' }}>{displayName}</p>
                  <p style={{ fontSize: '10px', fontWeight: 700, color: '#bfdbfe', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>{displayEmail}</p>
                </div>
              </div>
            </div>
            
            <button
              onClick={onCancel}
              style={{ width: '36px', height: '36px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.15)', color: '#fff', fontSize: '20px', border: '1px solid rgba(255, 255, 255, 0.2)', cursor: 'pointer', transition: 'background 0.2s' }}
              aria-label="Close approval modal"
              onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)'}
              onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'}
            >
              &times;
            </button>
          </div>
        </div>
  
        <div className="flex flex-col gap-4" style={{ padding: '24px' }}>
          {/* 1. Signature Pad — only for non-creator */}
          {!isCreator && (
            <section className="flex flex-col gap-2">
              <div className="flex justify-between items-end gap-4 px-2">
                <label className="text-[11px] font-black text-slate-800 uppercase tracking-widest">
                  เซ็นชื่อในกล่องด้านล่าง
                </label>
                <button
                  onClick={() => { sigPad.current.clear(); setHasSigned(false); }}
                  className="text-[9px] font-bold text-slate-400 hover:text-red-500 transition-colors uppercase tracking-widest"
                >
                  ล้างลายเซ็น
                </button>
              </div>
              <div className="rounded-2xl bg-slate-50/50 relative group transition-all hover:bg-white focus-within:bg-white hover:border-blue-400 border border-slate-200 shadow-sm overflow-hidden">
                {!hasSigned && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-slate-300 gap-1.5 opacity-80">
                    <span className="text-2xl">✍️</span>
                    <span className="text-[9px] font-bold tracking-widest uppercase">วาดลายเซ็นที่นี่</span>
                  </div>
                )}
                <SignaturePad
                  ref={sigPad}
                  onBegin={() => setHasSigned(true)}
                  canvasProps={{
                    className: "w-full h-32 cursor-crosshair"
                  }}
                  penColor="#1e40af"
                />
              </div>
            </section>
          )}

          {/* 2. Comment */}
          <section className="flex flex-col gap-2">
            <label className="block text-[11px] font-black text-slate-800 uppercase tracking-widest pl-2">
              ความเห็นเพิ่มเติม (ถ้ามี)
            </label>
            <textarea
              rows={isCreator ? 5 : 2}
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="ระบุความเห็น..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-50 outline-none text-sm font-medium transition-all resize-none shadow-sm"
              style={{ minHeight: isCreator ? '140px' : '80px', lineHeight: '1.5', padding: '16px 20px' }}
            />
          </section>

          {/* 3. PIN Verification — only for non-creator */}
          {!isCreator && requirePin && (
            <section className="flex flex-col gap-2">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 px-2">
                <div>
                  <label htmlFor="approval-pin" className="block text-[11px] font-black text-slate-800 uppercase tracking-widest mb-0.5">
                    ยืนยันด้วยรหัส PIN ของผู้อนุมัติ
                  </label>
                  <p className="text-[11px] font-medium text-slate-500">กรอก PIN 6 หลักของผู้อนุมัติเพื่อยืนยันตัวตน</p>
                </div>
                {resetSent ? (
                  <span className="text-[9px] text-emerald-600 font-bold uppercase tracking-widest bg-emerald-50 border border-emerald-100 rounded-full px-3 py-1 w-fit">
                    ✅ ส่งคำขอแล้ว
                  </span>
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
                    className="text-[9px] font-bold text-blue-600 hover:text-blue-800 transition-colors uppercase tracking-widest bg-blue-50 border border-blue-100 rounded-full px-2.5 py-1 w-fit mt-1 sm:mt-0"
                  >
                    ลืมรหัส PIN?
                  </button>
                )}
              </div>
               
              <div className="relative">
                <input
                  id="approval-pin"
                  type="password"
                  pattern="\d*"
                  inputMode="numeric"
                  maxLength={PIN_LENGTH}
                  value={pin}
                  onChange={e => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, PIN_LENGTH)
                    setPin(val)
                    setError('')
                    setPinTestResult(null)
                  }}
                  placeholder="••••••"
                  className="w-full h-14 rounded-2xl border border-slate-200 bg-slate-50/50 px-5 pr-16 text-center text-2xl font-black tracking-[0.4em] text-slate-900 outline-none transition-all hover:bg-white focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-50 placeholder:text-slate-300 shadow-sm"
                  autoFocus
                  autoComplete="one-time-code"
                  aria-describedby="approval-pin-progress"
                />
                <div id="approval-pin-progress" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-slate-200/50 px-2.5 py-1 text-[9px] font-black text-slate-600 tracking-widest pointer-events-none">
                  {pin.length}/{PIN_LENGTH}
                </div>
              </div>
              {onTestPin && (
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={handleTestPin}
                    disabled={testingPin || pin.length !== PIN_LENGTH}
                    className="h-10 rounded-xl border border-blue-100 bg-blue-50 text-blue-700 text-[11px] font-black tracking-widest hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {testingPin ? 'กำลังทดสอบ PIN...' : 'ทดสอบ PIN ก่อนอนุมัติ'}
                  </button>
                  {pinTestResult && (
                    <div className={`p-2.5 rounded-xl text-xs font-bold text-center border ${pinTestResult.success ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-red-50 border-red-100 text-red-600'}`}>
                      {pinTestResult.success ? '✅' : '⚠️'} {pinTestResult.message}
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {error && (
            <div className="mt-2 p-2.5 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-bold text-center animate-shake">
              ⚠️ {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/60 rounded-b-[1.5rem] sm:rounded-b-3xl" style={{ padding: '20px 24px' }}>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={onCancel}
              disabled={loading}
              className="flex-1 h-12 rounded-xl border border-slate-200 bg-white text-slate-600 font-bold text-[13px] hover:bg-slate-50 hover:text-slate-800 transition-all disabled:opacity-50"
            >
              ยกเลิก
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading || !canConfirm}
              className={`flex-1 h-12 rounded-xl font-bold text-[13px] text-white transition-all transform active:scale-[0.98] disabled:scale-100 ${
                canConfirm
                  ? 'bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-200/50'
                  : 'bg-slate-200 shadow-none cursor-not-allowed text-slate-400'
              }`}
            >
              {loading ? 'กำลังบันทึก...' : 'ยืนยันการอนุมัติ'}
            </button>
          </div>
          
          {!loading && !canConfirm && !isCreator && (
            <div className="flex items-center justify-center gap-2 opacity-60">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">กรุณาเซ็นชื่อและระบุ PIN ให้ครบถ้วน</span>
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
