'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function DashboardLayout({ children }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState(null)
  const [isSuperUser, setIsSuperUser] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.push('/')
      } else {
        setUser(session.user)
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', session.user.id)
          .single()
        setIsSuperUser(profile?.role === 'superuser')
      }
    })
  }, [])

  useEffect(() => { setSidebarOpen(false) }, [pathname])

  const handleLogout = async () => {
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (currentUser) {
      try {
        await supabase.from('login_logs').insert([{
          user_id: currentUser.id,
          user_email: currentUser.email,
          action: 'logout',
          ip_address: null,
          user_agent: navigator.userAgent.slice(0, 200)
        }])
      } catch {}
    }
    await supabase.auth.signOut()
    router.push('/')
  }

  const navItems = [
    // Operations
    { href: '/dashboard',                          label: 'Dashboard',       icon: '▦', section: 'operations' },
    { href: '/dashboard/incidents',                label: 'Incident',        icon: '⚠', section: 'operations' },
    { href: '/dashboard/backup',                   label: 'Backup Log',      icon: '☁', section: 'operations' },
    { href: '/dashboard/checklist',                label: 'Infra Checklist', icon: '✓', section: 'operations' },
    { href: '/dashboard/tasks',                    label: 'Daily Task',      icon: '◷', section: 'operations' },
    // Settings
    { href: '/dashboard/settings/no-series',       label: 'No. Series',      icon: '⚙', section: 'settings' },
    { href: '/dashboard/settings/master-data',     label: 'Master Data',     icon: '📋', section: 'settings' },
    { href: '/dashboard/settings/users',           label: 'Users',           icon: '👤', section: 'settings' },
    { href: '/dashboard/settings/change-password', label: 'Change Password', icon: '🔑', section: 'settings' },
  ]

  const isActive = (href) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', letterSpacing: 0.3 }}>DOWA IT</div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>Management System</div>
      </div>

      {/* Navigation */}
      <nav style={{ padding: '8px 0', flex: 1, overflowY: 'auto' }}>
        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, padding: '8px 16px 4px', textTransform: 'uppercase' }}>
          Operations
        </div>
        {navItems.filter(i => i.section === 'operations').map(item => (
          <Link key={item.href} href={item.href} className={`nav-item ${isActive(item.href) ? 'active' : ''}`}>
            <span style={{ fontSize: 14, width: 18, textAlign: 'center' }}>{item.icon}</span>
            {item.label}
          </Link>
        ))}

        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, padding: '12px 16px 4px', textTransform: 'uppercase' }}>
          Settings
        </div>
        {navItems.filter(i => i.section === 'settings').map(item => (
          <Link key={item.href} href={item.href} className={`nav-item ${isActive(item.href) ? 'active' : ''}`}>
            <span style={{ fontSize: 14, width: 18, textAlign: 'center' }}>{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Bottom — Email + Role + Logout */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>

        {/* Email */}
        <div style={{
          fontSize: 11,
          color: 'rgba(255,255,255,0.35)',
          wordBreak: 'break-all',
          marginBottom: isSuperUser ? 6 : 8
        }}>
          {user?.email}
        </div>

        {/* Administrator Badge — แสดงเฉพาะ Super User */}
        {isSuperUser && (
          <div style={{ marginBottom: 8 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              background: 'rgba(59,130,246,0.15)',
              border: '1px solid rgba(59,130,246,0.3)',
              borderRadius: 20, padding: '3px 10px'
            }}>
              <span style={{ fontSize: 10 }}>⭐</span>
              <span style={{ fontSize: 10, color: '#60a5fa', fontWeight: 600, letterSpacing: 0.3 }}>
                Administrator
              </span>
            </div>
          </div>
        )}

        {/* Logout */}
        <button
          onClick={handleLogout}
          style={{
            width: '100%', padding: '7px',
            background: 'rgba(255,255,255,0.06)',
            color: 'rgba(255,255,255,0.6)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 6, fontSize: 12,
            cursor: 'pointer', fontFamily: 'inherit'
          }}
        >
          ออกจากระบบ
        </button>
      </div>
    </>
  )

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>

      {/* Desktop Sidebar */}
      <div className="sidebar" style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <SidebarContent />
      </div>

      {/* Mobile Overlay */}
      <div
        className={`mobile-overlay ${sidebarOpen ? 'open' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Mobile Sidebar */}
      <div style={{
        display: 'flex', flexDirection: 'column',
        height: '100vh', position: 'fixed', zIndex: 50,
        background: '#0f1923', width: 220,
        transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.3s ease'
      }}>
        <SidebarContent />
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, overflow: 'auto', background: '#f0f2f5', display: 'flex', flexDirection: 'column' }}>

        {/* Mobile Topbar */}
        <div
          style={{ display: 'none', background: '#0f1923', padding: '12px 16px', alignItems: 'center', gap: 12, flexShrink: 0 }}
          className="mobile-topbar"
        >
          <button
            onClick={() => setSidebarOpen(true)}
            style={{ background: 'none', border: 'none', color: '#fff', fontSize: 20, cursor: 'pointer', padding: 0, lineHeight: 1 }}
          >
            ☰
          </button>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>DOWA IT System</div>
        </div>

        <div style={{ flex: 1, overflow: 'auto' }}>
          {children}
        </div>
      </div>
    </div>
  )
}