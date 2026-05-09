'use client'
import { useState, useRef, useEffect } from 'react'
import SignaturePad from 'react-signature-canvas'
import { requestSignaturePinReset } from '@/app/actions/user'

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
  requirePin = true,
  title = "ยืนยันการอนุมัติเอกสาร"
}) {
  const [pin, setPin] = useState('')
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')
  const [resetSent, setResetSent] = useState(false)
  const sigPad = useRef(null)

  useEffect(() => {
    if (isOpen) {
      setPin('')
      setComment('')
      setError('')
      setResetSent(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleConfirm = async () => {
    if (requirePin && pin.length !== 6) {
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

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[2000] p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-start">
          <div>
            <h3 className="text-xl font-bold text-slate-800">{title}</h3>
            <p className="text-sm text-slate-500 mt-1">
              ผู้อนุมัติ: <span className="font-bold text-blue-600">{approverName}</span>
            </p>
          </div>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 transition-colors text-2xl">&times;</button>
        </div>

        <div className="p-8">
          {/* 1. Signature Pad */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs">1</span>
              เซ็นชื่อในกล่องด้านล่าง
            </label>
            <div className="border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 relative group transition-colors hover:border-blue-300">
              <SignaturePad 
                ref={sigPad}
                canvasProps={{ 
                  className: "w-full h-44 cursor-crosshair"
                }}
                penColor="#1e40af"
              />
              <button 
                onClick={() => sigPad.current.clear()}
                className="absolute right-3 bottom-3 px-3 py-1 text-xs font-semibold bg-white border border-slate-200 text-slate-500 rounded-lg hover:bg-slate-50 transition-colors"
              >
                ล้างลายเซ็น
              </button>
            </div>
          </div>

          {/* 2. Comment */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
              <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs">2</span>
              ความเห็นเพิ่มเติม (ถ้ามี)
            </label>
            <textarea 
              rows={2}
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="ระบุความเห็นหรือข้อเสนอแนะ..."
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 focus:border-blue-400 focus:ring-0 outline-none text-sm transition-all resize-none"
            />
          </div>

          {/* 3. PIN Verification */}
          {requirePin && (
            <div className="mb-2">
              <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs">3</span>
                ยืนยันด้วยรหัส PIN 6 หลัก
              </label>
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
                className="w-full py-4 text-3xl tracking-[1.5rem] text-center font-mono rounded-2xl border-2 border-slate-100 focus:border-blue-500 outline-none transition-all placeholder:tracking-normal placeholder:text-slate-200"
              />
              <div className="flex justify-end mt-2">
                {resetSent ? (
                  <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                    ✅ ส่งคำขอไปยังอีเมลของคุณแล้ว
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
                    className="text-xs text-blue-600 hover:underline font-semibold"
                  >
                    ลืมรหัส PIN?
                  </button>
                )}
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-bold text-center animate-shake">
              ⚠️ {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-6 bg-slate-50 flex gap-4">
          <button 
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-3.5 rounded-2xl border-2 border-slate-200 bg-white text-slate-600 font-bold hover:bg-slate-100 transition-all disabled:opacity-50"
          >
            ยกเลิก
          </button>
          <button 
            onClick={handleConfirm}
            disabled={loading || (requirePin && pin.length !== 6)}
            className={`flex-[2] py-3.5 rounded-2xl font-bold text-white shadow-lg transition-all transform active:scale-95 disabled:scale-100 ${
              (!requirePin || pin.length === 6) 
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-200' 
                : 'bg-slate-300 shadow-none cursor-not-allowed'
            }`}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                กำลังบันทึก...
              </span>
            ) : (
              'ยืนยันและอนุมัติงาน'
            )}
          </button>
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
