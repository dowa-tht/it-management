'use client'

import React, { useState, useEffect } from 'react'

export function useWorkflowNotification() {
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' })
  const [modal, setModal] = useState({ show: false, title: '', message: '', type: 'success', onClose: null })

  const showToast = ({ message, type = 'success' }) => {
    setToast({ show: true, message, type })
  }

  const showModal = ({ title, message, type = 'success', onClose = null }) => {
    setModal({ show: true, title, message, type, onClose })
  }

  const closeModal = () => {
    const onClose = modal.onClose
    setModal(prev => ({ ...prev, show: false, onClose: null }))
    if (typeof onClose === 'function') onClose()
  }

  useEffect(() => {
    if (!toast.show) return
    const timer = setTimeout(() => setToast(prev => ({ ...prev, show: false })), 4000)
    return () => clearTimeout(timer)
  }, [toast.show])

  const NotificationComponent = () => {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes slideInToast {
            from { transform: translateX(36px); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
          @keyframes scaleInDialog {
            from { transform: scale(0.96) translateY(8px); opacity: 0; }
            to { transform: scale(1) translateY(0); opacity: 1; }
          }
        ` }} />

        {toast.show && (
          <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, width: 'min(360px, calc(100vw - 24px))', animation: 'slideInToast 0.24s ease-out forwards' }}>
            <div style={{ background: '#fff', border: '1px solid #dbe4f1', borderRadius: 12, boxShadow: '0 18px 40px -24px rgba(15, 23, 42, 0.4)', display: 'flex', alignItems: 'center', gap: 12, padding: 14, position: 'relative' }}>
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 5, borderTopLeftRadius: 12, borderBottomLeftRadius: 12, background: toast.type === 'error' ? '#ef4444' : '#0891b2' }} />
              <div style={{ width: 36, height: 36, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: toast.type === 'error' ? '#fee2e2' : '#cffafe', marginLeft: 6 }}>
                {toast.type === 'error' ? (
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#dc2626" strokeWidth="2.6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#0e7490" strokeWidth="2.6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <p style={{ margin: 0, flex: 1, fontSize: 14, fontWeight: 600, color: '#1f2937' }}>{toast.message}</p>
              <button onClick={() => setToast(prev => ({ ...prev, show: false }))} style={{ border: 'none', background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>&times;</button>
            </div>
          </div>
        )}

        {modal.show && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div onClick={closeModal} style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 20% 10%, rgba(30,64,175,0.18), transparent 45%), rgba(2,6,23,0.5)', backdropFilter: 'blur(4px)' }} />
            <div style={{ position: 'relative', width: '100%', maxWidth: 380, borderRadius: 14, border: '1px solid #dbe4f1', background: 'linear-gradient(180deg,#ffffff 0%,#f9fbff 100%)', boxShadow: '0 26px 60px -34px rgba(15,23,42,0.55)', padding: '18px 16px 14px', textAlign: 'center', animation: 'scaleInDialog 0.24s ease-out forwards' }}>
              <div style={{ width: 54, height: 54, borderRadius: 999, margin: '0 auto 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: modal.type === 'error' ? '#fee2e2' : '#ccfbf1' }}>
                {modal.type === 'error' ? (
                  <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#dc2626" strokeWidth="2.6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#0f766e" strokeWidth="2.6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <h3 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: '#0f172a', lineHeight: 1.08 }}>{modal.title}</h3>
              <p style={{ margin: '6px 0 14px 0', fontSize: 16, color: '#475569', fontWeight: 500, lineHeight: 1.3 }}>{modal.message}</p>
              <button
                onClick={closeModal}
                style={{ width: '100%', height: 40, border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 20, fontWeight: 800, color: '#fff', background: modal.type === 'error' ? 'linear-gradient(135deg,#ef4444 0%,#dc2626 100%)' : 'linear-gradient(135deg,#10b981 0%,#0ea5a4 100%)' }}
              >
                ตกลง
              </button>
            </div>
          </div>
        )}
      </>
    )
  }

  return { NotificationComponent, showToast, showModal }
}
