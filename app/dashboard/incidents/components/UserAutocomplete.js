'use client'
import { useState, useEffect, useRef } from 'react'
import { searchUsers } from '@/app/actions/users'

export function UserAutocomplete({ value, onChange, placeholder = 'พิมพ์เพื่อค้นหาชื่อผู้แจ้ง...', disabled = false }) {
  const [query, setQuery] = useState(typeof value === 'string' ? value : (value?.full_name || ''))
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    if (value) {
      setQuery(typeof value === 'string' ? value : (value.full_name || ''))
    } else {
      setQuery('')
    }
  }, [value])

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
    if (query.length === 0) {
      setResults([])
      return
    }
    const timer = setTimeout(async () => {
      if (disabled) return
      setLoading(true)
      const res = await searchUsers(query)
      if (res.data) setResults(res.data)
      setLoading(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  const handleSelect = (user) => {
    if (disabled) return
    onChange(user)
    setQuery(user.full_name)
    setIsOpen(false)
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <input
        type="text"
        value={query}
        onChange={(e) => { 
          if (disabled) return
          setQuery(e.target.value); 
          setIsOpen(true);
          if (e.target.value === '') {
            onChange(null); // Clear selection if input is cleared
          }
        }}
        onFocus={() => !disabled && setIsOpen(true)}
        placeholder={placeholder}
        disabled={disabled}
        style={{
          width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, outline: 'none',
          background: disabled ? '#f8fafc' : '#fff', color: disabled ? '#64748b' : '#111827', cursor: disabled ? 'not-allowed' : 'text'
        }}
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

        </div>
      )}

      <style jsx>{`
        .hover-item:hover {
          background-color: #f9fafb;
        }
        .btn-premium {
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .btn-premium:hover {
          filter: brightness(1.1);
          box-shadow: 0 4px 12px rgba(29, 78, 216, 0.2);
        }
        .btn-premium:active {
          transform: scale(0.95);
        }
        .btn-premium:disabled {
          cursor: not-allowed;
          opacity: 0.7;
          transform: none;
        }
      `}</style>
    </div>
  )
}
