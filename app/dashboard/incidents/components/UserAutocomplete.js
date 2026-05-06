'use client'
import { useState, useEffect, useRef } from 'react'
import { searchUsers, quickAddUser } from '@/app/actions/users'

export function UserAutocomplete({ value, onChange, placeholder = 'พิมพ์เพื่อค้นหาชื่อผู้แจ้ง...' }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [newUserInfo, setNewUserInfo] = useState({ fullName: '', email: '' })
  const containerRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (query.length < 2) {
      setResults([])
      return
    }
    const timer = setTimeout(async () => {
      setLoading(true)
      const res = await searchUsers(query)
      if (res.data) setResults(res.data)
      setLoading(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  const handleSelect = (user) => {
    onChange(user)
    setQuery(user.full_name)
    setIsOpen(false)
  }

  const handleQuickAdd = async () => {
    if (!newUserInfo.fullName) return
    setLoading(true)
    const res = await quickAddUser(newUserInfo)
    if (res.error) {
      alert(res.error)
    } else {
      handleSelect(res.data)
      setShowQuickAdd(false)
      setNewUserInfo({ fullName: '', email: '' })
    }
    setLoading(false)
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <input
        type="text"
        value={query || value || ''}
        onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        style={{ width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, outline: 'none' }}
      />
      
      {isOpen && (query.length >= 2 || results.length > 0) && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, marginTop: 4, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', zIndex: 50, maxHeight: 250, overflowY: 'auto' }}>
          {loading && <div style={{ padding: '10px 12px', fontSize: 12, color: '#6b7280' }}>กำลังค้นหา...</div>}
          
          {results.map((u) => (
            <div key={u.id} onClick={() => handleSelect(u)} style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #f3f4f6' }} className="hover-item">
              <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{u.full_name}</div>
              <div style={{ fontSize: 11, color: '#6b7280' }}>{u.email || 'ไม่มีอีเมล'} · Role: {u.role}</div>
            </div>
          ))}

          {!loading && (
            <div onClick={() => setShowQuickAdd(true)} style={{ padding: '10px 12px', cursor: 'pointer', color: '#1d4ed8', fontSize: 13, fontWeight: 600, background: '#eff6ff' }}>
              + เพิ่มผู้ใช้ใหม่ "{query}"
            </div>
          )}
        </div>
      )}

      {showQuickAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 20, width: '100%', maxWidth: 360 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>เพิ่มผู้แจ้งใหม่แบบด่วน</h3>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 4 }}>ชื่อ-นามสกุล</label>
              <input value={newUserInfo.fullName} onChange={e => setNewUserInfo({...newUserInfo, fullName: e.target.value})} style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 4 }}>อีเมล (ถ้ามี)</label>
              <input value={newUserInfo.email} onChange={e => setNewUserInfo({...newUserInfo, email: e.target.value})} style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }} />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowQuickAdd(false)} style={{ padding: '7px 14px', background: '#fff', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }}>ยกเลิก</button>
              <button onClick={handleQuickAdd} disabled={loading} style={{ padding: '7px 20px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600 }}>บันทึก</button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .hover-item:hover {
          background-color: #f9fafb;
        }
      `}</style>
    </div>
  )
}
