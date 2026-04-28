'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Step 1: Login ด้วย Supabase Auth
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    // Step 2: ถ้า Login ไม่สำเร็จ
    if (signInError) {
      setError('Email หรือ Password ไม่ถูกต้อง')
      setLoading(false)
      return
    }

    // Step 3: บันทึก Login Log
    try {
      await supabase.from('login_logs').insert([{
        user_id: data.user.id,
        user_email: data.user.email,
        action: 'login',
        ip_address: null,
        user_agent: navigator.userAgent.slice(0, 200)
      }])
    } catch (logError) {
      // ถ้า log ไม่ได้ก็ไม่เป็นไร ไม่ block การ login
      console.warn('Login log error:', logError)
    }

    // Step 4: ไปหน้า Dashboard
    router.push('/dashboard')
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0f1923',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0 16px'
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 12,
        padding: '40px 36px',
        width: '100%',
        maxWidth: 380,
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }}>
        {/* Logo */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#0f1923' }}>DOWA IT System</div>
          <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>IT Management Portal</div>
        </div>

        <form onSubmit={handleLogin}>
          {/* Email */}
          <div style={{ marginBottom: 16 }}>
            <label style={{
              fontSize: 12, fontWeight: 500, color: '#374151',
              display: 'block', marginBottom: 6
            }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="your@email.com"
              style={{
                width: '100%', padding: '10px 12px',
                border: '1px solid #d1d5db', borderRadius: 8,
                fontSize: 14, outline: 'none', fontFamily: 'inherit',
                transition: 'border-color 0.15s'
              }}
              onFocus={e => e.target.style.borderColor = '#3b82f6'}
              onBlur={e => e.target.style.borderColor = '#d1d5db'}
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: 20 }}>
            <label style={{
              fontSize: 12, fontWeight: 500, color: '#374151',
              display: 'block', marginBottom: 6
            }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                style={{
                  width: '100%', padding: '10px 12px', paddingRight: '40px',
                  border: '1px solid #d1d5db', borderRadius: 8,
                  fontSize: 14, outline: 'none', fontFamily: 'inherit',
                  transition: 'border-color 0.15s'
                }}
                onFocus={e => e.target.style.borderColor = '#3b82f6'}
                onBlur={e => e.target.style.borderColor = '#d1d5db'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex="-1"
                style={{
                  position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                  fontSize: 16, color: '#9ca3af', display: 'flex', alignItems: 'center'
                }}
              >
                {showPassword ? '👁️' : '🙈'}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div style={{
              background: '#fee2e2', color: '#991b1b',
              padding: '10px 12px', borderRadius: 8,
              fontSize: 13, marginBottom: 16,
              display: 'flex', alignItems: 'center', gap: 8
            }}>
              ⚠️ {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '11px',
              background: loading ? '#93c5fd' : '#1d4ed8',
              color: '#fff', border: 'none', borderRadius: 8,
              fontSize: 14, fontWeight: 500,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', transition: 'background 0.15s'
            }}
          >
            {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
          </button>
        </form>

        {/* Footer */}
        <div style={{ marginTop: 24, textAlign: 'center', fontSize: 11, color: '#d1d5db' }}>
          DOWA IT System v1.0 · Secured by Supabase
        </div>
      </div>
    </div>
  )
}