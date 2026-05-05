'use client'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function AuthCallbackPopup() {
  useEffect(() => {
    const processAuth = async () => {
      // รอให้ Supabase จัดการเรื่อง Session/Code ให้เรียบร้อยก่อน
      await supabase.auth.getSession()
      
      if (window.opener) {
        // ส่งสัญญาณบอกหน้าหลัก
        window.opener.postMessage({ type: 'm365_linked_success' }, window.location.origin)
        // ปิดหน้าต่าง (หน่วงเวลาเล็กน้อยเพื่อให้แน่ใจว่าส่งข้อความสำเร็จ)
        setTimeout(() => window.close(), 500)
      }
    }
    processAuth()
  }, [])

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'sans-serif', textAlign: 'center', padding: 20 }}>
      <div>
        <div style={{ fontSize: 24, marginBottom: 12 }}>⚡</div>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: '#111827' }}>กำลังดำเนินการเชื่อมต่อ...</h2>
        <p style={{ fontSize: 14, color: '#6b7280' }}>หน้าต่างนี้จะปิดลงอัตโนมัติเมื่อเสร็จสิ้น</p>
      </div>
    </div>
  )
}
