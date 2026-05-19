'use client'

import React, { useState, useEffect } from 'react'

export function useWorkflowNotification() {
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' })
  const [modal, setModal] = useState({ show: false, title: '', message: '', type: 'success' })

  const showToast = ({ message, type = 'success' }) => {
    setToast({ show: true, message, type })
  }

  const showModal = ({ title, message, type = 'success' }) => {
    setModal({ show: true, title, message, type })
  }

  const closeModal = () => {
    setModal(prev => ({ ...prev, show: false }))
  }

  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => {
        setToast(prev => ({ ...prev, show: false }))
      }, 4000)
      return () => clearTimeout(timer)
    }
  }, [toast.show])

  const NotificationComponent = () => {
    return (
      <>
        {/* Style definitions for Premium Animations */}
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes slideIn {
            from { transform: translateX(120%) scale(0.9); opacity: 0; }
            to { transform: translateX(0) scale(1); opacity: 1; }
          }
          @keyframes scaleIn {
            from { transform: scale(0.95) translateY(10px); opacity: 0; }
            to { transform: scale(1) translateY(0); opacity: 1; }
          }
          @keyframes drawCheck {
            to { stroke-dashoffset: 0; }
          }
          .animate-slide-in {
            animation: slideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
          .animate-scale-in {
            animation: scaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          }
          .svg-circle-draw {
            stroke-dasharray: 166;
            stroke-dashoffset: 166;
            animation: drawCheck 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards;
            animation-delay: 0.1s;
          }
          .svg-check-draw {
            stroke-dasharray: 48;
            stroke-dashoffset: 48;
            animation: drawCheck 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards;
            animation-delay: 0.5s;
          }
          .svg-cross-draw-1 {
            stroke-dasharray: 48;
            stroke-dashoffset: 48;
            animation: drawCheck 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards;
            animation-delay: 0.4s;
          }
          .svg-cross-draw-2 {
            stroke-dasharray: 48;
            stroke-dashoffset: 48;
            animation: drawCheck 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards;
            animation-delay: 0.6s;
          }
        ` }} />

        {/* 1. TOAST NOTIFICATION (Option B) */}
        {toast.show && (
          <div className="fixed top-6 right-6 z-[9999] max-w-sm w-full animate-slide-in">
            <div 
              style={{
                background: 'rgba(255, 255, 255, 0.82)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(226, 232, 240, 0.8)',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 10px 10px -5px rgba(0, 0, 0, 0.02)'
              }}
              className="rounded-2xl p-4 flex items-center gap-4 relative overflow-hidden"
            >
              {/* Left Accent indicator */}
              <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                toast.type === 'error' ? 'bg-rose-500' : 'bg-emerald-500'
              }`} />
              
              {/* Icon */}
              <div className={`flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full ${
                toast.type === 'error' ? 'bg-rose-50' : 'bg-emerald-50'
              }`}>
                {toast.type === 'error' ? (
                  <svg className="w-5 h-5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>

              {/* Message */}
              <div className="flex-1 pr-4">
                <p className="text-sm font-medium text-slate-800">{toast.message}</p>
              </div>

              {/* Close Button */}
              <button 
                onClick={() => setToast(prev => ({ ...prev, show: false }))}
                className="flex-shrink-0 text-slate-400 hover:text-slate-600 transition-colors rounded-lg p-1 hover:bg-slate-100/50"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* 2. MODAL NOTIFICATION (Option A) */}
        {modal.show && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop with premium blur */}
            <div 
              className="absolute inset-0 bg-slate-900/30 backdrop-blur-md transition-opacity duration-300"
              onClick={closeModal}
            />

            {/* Modal Body */}
            <div 
              style={{
                background: 'rgba(255, 255, 255, 0.88)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                border: '1px solid rgba(255, 255, 255, 0.6)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)'
              }}
              className="relative w-full max-w-md rounded-3xl p-8 flex flex-col items-center text-center animate-scale-in overflow-hidden"
            >
              {/* Premium Animated Icon container */}
              <div className="mb-6 relative">
                {modal.type === 'error' ? (
                  <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center">
                    <svg className="w-12 h-12 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <line className="svg-cross-draw-1" x1="18" y1="6" x2="6" y2="18" strokeLinecap="round" strokeDasharray="48" strokeDashoffset="48" />
                      <line className="svg-cross-draw-2" x1="6" y1="6" x2="18" y2="18" strokeLinecap="round" strokeDasharray="48" strokeDashoffset="48" />
                    </svg>
                  </div>
                ) : (
                  <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center">
                    <svg className="w-12 h-12 text-emerald-500" viewBox="0 0 52 52">
                      <circle className="svg-circle-draw text-emerald-100" stroke="currentColor" strokeWidth="3" fill="none" cx="26" cy="26" r="25" />
                      <path className="svg-check-draw" stroke="currentColor" strokeWidth="4.5" fill="none" strokeLinecap="round" d="M14 27l7.5 7.5L38 18" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Title & Description */}
              <h3 className="text-xl font-bold text-slate-800 mb-2">{modal.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-8">{modal.message}</p>

              {/* Action Button */}
              <button 
                onClick={closeModal}
                style={{
                  background: modal.type === 'error' 
                    ? 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)' 
                    : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  boxShadow: modal.type === 'error'
                    ? '0 10px 15px -3px rgba(244, 63, 94, 0.3)'
                    : '0 10px 15px -3px rgba(16, 185, 129, 0.3)'
                }}
                className="w-full py-3 px-6 text-white font-semibold rounded-2xl hover:brightness-105 active:scale-[0.98] transition-all duration-200"
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
