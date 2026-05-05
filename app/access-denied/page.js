'use client'
import { useRouter } from 'next/navigation'

export default function AccessDeniedPage() {
  const router = useRouter()

  return (
    <div style={{
      minHeight: '100vh', background: '#0a0f16',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px', fontFamily: 'inherit'
    }}>
      {/* Background Glow */}
      <div style={{ position: 'fixed', top: '20%', left: '30%', width: '400px', height: '400px', background: 'rgba(220, 38, 38, 0.1)', filter: 'blur(100px)', borderRadius: '50%', zIndex: 0 }} />

      <div style={{
        background: 'rgba(255, 255, 255, 0.03)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(220, 38, 38, 0.2)',
        borderRadius: 24, padding: '48px 40px',
        width: '100%', maxWidth: 450,
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
        zIndex: 1, position: 'relative',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: 64, marginBottom: 24 }}>🚫</div>
        
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#fff', marginBottom: 16, letterSpacing: '-0.5px' }}>
          การเข้าถึงถูกปฏิเสธ
        </h1>
        
        <div style={{ 
          background: 'rgba(220, 38, 38, 0.1)', 
          color: '#f87171', 
          padding: '20px', 
          borderRadius: 16, 
          fontSize: 15, 
          lineHeight: 1.6,
          marginBottom: 32,
          border: '1px solid rgba(220, 38, 38, 0.2)'
        }}>
          <strong>บัญชีของคุณไม่ได้รับอนุญาตให้เข้าใช้งานระบบ</strong><br/>
          อีเมลนี้ไม่มีอยู่ในระบบ โปรดติดต่อผู้ดูแลระบบเพื่อขอสิทธิ์การเข้าใช้งาน
        </div>

        <button 
          onClick={() => window.location.href = '/'}
          style={{ 
            width: '100%', padding: '16px', background: '#dc2626', color: '#fff', 
            border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 700, 
            cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 10px 15px -3px rgba(220, 38, 38, 0.3)'
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
          รับทราบและกลับไปหน้าหลัก
        </button>

        <div style={{ marginTop: 32, fontSize: 12, color: '#475569' }}>
          DOWA IT System · Security Gatekeeper
        </div>
      </div>
    </div>
  )
}
