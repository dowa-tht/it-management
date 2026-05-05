'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    const handleCallback = async () => {
      console.log('🛡️ Gatekeeper: Checking session...')
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        console.error('❌ Gatekeeper: Session error:', sessionError.message)
        window.location.href = '/access-denied'
        return
      }

      if (session?.user) {
        const user = session.user
        console.log(`🛡️ Gatekeeper: Authenticated as ${user.email}. Verifying Whitelist...`)

        try {
          const verifyRes = await fetch('/api/auth/cleanup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id, email: user.email })
          })
          const verifyResult = await verifyRes.json()

          // ❌ ถ้าไม่ได้รับอนุญาต (Unauthorized)
          if (!verifyResult.authorized) {
            console.log('🚫 Gatekeeper: Unauthorized or Intruder purged!')
            await supabase.auth.signOut()
            window.location.href = '/access-denied'
            return
          }
          
          // ✅ ถ้าผ่านการตรวจสอบ (Authorized)
          console.log('✅ Gatekeeper: Authorized by Whitelist. Proceeding...')
          
          // 📝 บันทึก Log การเข้าใช้งาน (Audit Trail)
          try {
            await supabase.from('login_logs').insert([{
              user_id: user.id,
              user_email: user.email,
              action: 'login',
              user_agent: typeof window !== 'undefined' ? navigator.userAgent.slice(0, 200) : 'Server'
            }])
          } catch (logErr) {
            console.error('⚠️ Log Error:', logErr)
          }

          router.push('/dashboard')

        } catch (e) {
          console.error('⚠️ Gatekeeper: Verification failed:', e)
          await supabase.auth.signOut()
          window.location.href = '/access-denied'
        }
      } else {
        console.log('🛡️ Gatekeeper: No session found.')
        window.location.href = '/access-denied'
      }
    }
    handleCallback()
  }, [router])

  return (
    <div style={{ 
      minHeight: '100vh', background: '#0a0f16', 
      display: 'flex', alignItems: 'center', justifyContent: 'center', 
      color: '#fff', fontFamily: 'inherit' 
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ 
          width: 50, height: 50, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.1)', 
          borderTopColor: '#3b82f6', margin: '0 auto 20px', animation: 'spin 1s linear infinite' 
        }} />
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
        <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '0.5px' }}>🛡️ GATEKEEPER</div>
        <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 10 }}>กำลังตรวจสอบสิทธิ์การเข้าใช้งาน...</div>
      </div>
    </div>
  )
}
