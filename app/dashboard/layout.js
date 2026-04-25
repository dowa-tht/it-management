'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function DashboardLayout({ children }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push('/')
      else setUser(session.user)
    })
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: '▦' },
    { href: '/dashboard/incidents', label: 'Incident', icon: '⚠' },
    { href: '/dashboard/backup', label: 'Backup Log', icon: '☁' },
    { href: '/dashboard/checklist', label: 'Infra Checklist', icon: '✓' },
    { href: '/dashboard/tasks', label: 'Daily Task', icon: '◷' },
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <div className="sidebar" style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>DOWA IT</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>Management System</div>
        </div>

        <nav style={{ padding: '12px 0', flex: 1 }}>
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${pathname === item.href ? 'active' : ''}`}
            >
              <span style={{ fontSize: 14 }}>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>
            {user?.email}
          </div>
          <button
            onClick={handleLogout}
            style={{
              width: '100%', padding: '7px', background: 'rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 6, fontSize: 12, cursor: 'pointer'
            }}
          >
            ออกจากระบบ
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        {children}
      </div>
    </div>
  )
}