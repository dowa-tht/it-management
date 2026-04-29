'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function GuestAccessPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [pin, setPin] = useState(['', '', '', '', '', '']) // 6 digits PIN
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handlePinChange = (index, value) => {
    if (isNaN(value)) return
    const newPin = [...pin]
    newPin[index] = value.substring(value.length - 1)
    setPin(newPin)

    // Auto focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`pin-${index + 1}`)
      nextInput?.focus()
    }
  }

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      const prevInput = document.getElementById(`pin-${index - 1}`)
      prevInput?.focus()
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const fullPin = pin.join('')
    if (fullPin.length < 6) {
      setError('กรุณากรอก PIN ให้ครบ 6 หลัก')
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/guest/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, pin: fullPin })
      })
      const data = await res.json()

      if (res.ok) {
        router.push('/dashboard')
      } else {
        setError(data.error || 'การเข้าสู่ระบบล้มเหลว')
      }
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#0f172a', // Dark theme สำหรับความหรูหรา
      backgroundImage: 'radial-gradient(circle at 50% 50%, #1e293b 0%, #0f172a 100%)',
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      padding: '24px',
      fontFamily: 'Inter, sans-serif'
    }}>
      <div style={{ 
        width: '100%', 
        maxWidth: '440px', 
        textAlign: 'center'
      }}>
        {/* Logo/Icon */}
        <div style={{ 
          width: '80px', 
          height: '80px', 
          background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
          borderRadius: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '32px',
          margin: '0 auto 24px',
          boxShadow: '0 0 40px rgba(37, 99, 235, 0.3)'
        }}>
          🔑
        </div>

        <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#f8fafc', marginBottom: '8px' }}>
          Guest Access
        </h1>
        <p style={{ color: '#94a3b8', marginBottom: '40px' }}>
          กรุณายืนยันตัวตนเพื่อเข้าถึงระบบไอที
        </p>

        <form onSubmit={handleSubmit} style={{ 
          background: 'rgba(30, 41, 59, 0.5)', 
          backdropFilter: 'blur(16px)',
          padding: '40px',
          borderRadius: '32px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
        }}>
          
          <div style={{ marginBottom: '24px', textAlign: 'left' }}>
            <label style={{ color: '#cbd5e1', fontSize: '14px', marginBottom: '8px', display: 'block', fontWeight: '500' }}>
              Email Address
            </label>
            <input 
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your-email@company.com"
              style={{ 
                width: '100%', 
                padding: '14px 16px', 
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                color: '#fff',
                fontSize: '15px',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ marginBottom: '32px', textAlign: 'left' }}>
            <label style={{ color: '#cbd5e1', fontSize: '14px', marginBottom: '12px', display: 'block', fontWeight: '500' }}>
              6-Digit Secure PIN
            </label>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              {pin.map((digit, idx) => (
                <input 
                  key={idx}
                  id={`pin-${idx}`}
                  type="text"
                  inputMode="numeric"
                  maxLength="1"
                  value={digit}
                  onChange={(e) => handlePinChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  style={{ 
                    width: '45px',
                    height: '56px',
                    textAlign: 'center',
                    fontSize: '24px',
                    fontWeight: '700',
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '2px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    color: '#3b82f6',
                    outline: 'none',
                    transition: 'all 0.2s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
                />
              ))}
            </div>
          </div>

          {error && (
            <div style={{ 
              color: '#f87171', 
              fontSize: '13px', 
              marginBottom: '20px',
              padding: '10px',
              background: 'rgba(239, 68, 68, 0.1)',
              borderRadius: '8px',
              border: '1px solid rgba(239, 68, 68, 0.2)'
            }}>
              ⚠️ {error}
            </div>
          )}

          <button 
            type="submit"
            disabled={loading}
            style={{ 
              width: '100%', 
              padding: '16px', 
              background: '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: '16px',
              fontWeight: '700',
              fontSize: '16px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 10px 20px -5px rgba(37, 99, 235, 0.4)'
            }}
            onMouseOver={(e) => e.target.style.background = '#1d4ed8'}
            onMouseOut={(e) => e.target.style.background = '#2563eb'}
          >
            {loading ? 'Verifying...' : 'Access System'}
          </button>

          <div style={{ marginTop: '24px' }}>
            <a href="/reset-pin" style={{ color: '#94a3b8', fontSize: '13px', textDecoration: 'none' }}>
              ลืมรหัส PIN? ขอรหัสใหม่
            </a>
          </div>
        </form>

        <p style={{ marginTop: '40px', color: '#475569', fontSize: '12px' }}>
          &copy; 2026 DOWA IT System. All rights reserved.
        </p>
      </div>
    </div>
  )
}
