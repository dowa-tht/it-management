'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function DashboardLayout({ children }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [isSuperUser, setIsSuperUser] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [expandedSection, setExpandedSection] = useState(null)
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.push('/')
      } else {
        setUser(session.user)
        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('role, full_name')
          .eq('id', session.user.id)
          .single()
        setProfile(profileData)
        setIsSuperUser(profileData?.role === 'superuser')
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        router.push('/')
      }
    })

    return () => {
      subscription?.unsubscribe()
    }
  }, [])

  // Auto-expand current section on first load or path change
  useEffect(() => {
    setSidebarOpen(false)
    if (pathname.includes('/settings/')) {
      setExpandedSection('settings')
    } else if (pathname.startsWith('/dashboard/incidents') || pathname === '/dashboard' || pathname.includes('/backup') || pathname.includes('/checklist')) {
      setExpandedSection('operations')
    }
  }, [pathname])

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
    { href: '/dashboard/reports/sla',             label: 'SLA Report',      icon: '📊', section: 'operations' },
    { href: '/dashboard/backup',                   label: 'Backup Log',      icon: '☁', section: 'operations' },
    { href: '/dashboard/checklist',                label: 'IT Checklist',    icon: '✅', section: 'operations' },
    // Settings
    { href: '/dashboard/settings/no-series',       label: 'No. Series',      icon: '⚙', section: 'settings' },
    { href: '/dashboard/settings/master-data',     label: 'Master Data',     icon: '📋', section: 'settings' },
    { href: '/dashboard/settings/users',           label: 'Users',           icon: '👤', section: 'settings' },
  ]

  const isActive = (href) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  const toggleSection = (section) => {
    setExpandedSection(prev => prev === section ? null : section)
  }

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <Link href="/dashboard" style={{ display: 'block', padding: '20px 16px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', textDecoration: 'none' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', letterSpacing: 0.3 }}>DOWA IT</div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>Management System</div>
      </Link>

      {/* Navigation */}
      <nav style={{ padding: '8px 0', flex: 1, overflowY: 'auto' }}>
        {/* Operations Section */}
        <div 
          onClick={() => toggleSection('operations')}
          style={{ 
            fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, padding: '12px 16px 8px', 
            textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            cursor: 'pointer', transition: 'background 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >
          <span>Operations</span>
          <span style={{ 
            fontSize: 10, transition: 'transform 0.3s', 
            transform: expandedSection === 'operations' ? 'rotate(0deg)' : 'rotate(-90deg)' 
          }}>▼</span>
        </div>
        <div style={{ 
          maxHeight: expandedSection === 'operations' ? '500px' : '0', 
          overflow: 'hidden', transition: 'max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1)' 
        }}>
          {navItems.filter(i => i.section === 'operations').map(item => (
            <Link key={item.href} href={item.href} className={`nav-item ${isActive(item.href) ? 'active' : ''}`}>
              <span style={{ fontSize: 14, width: 18, textAlign: 'center' }}>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>

        {/* Settings Section */}
        <div 
          onClick={() => toggleSection('settings')}
          style={{ 
            fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, padding: '16px 16px 8px', 
            textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            cursor: 'pointer', transition: 'background 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >
          <span>Settings</span>
          <span style={{ 
            fontSize: 10, transition: 'transform 0.3s', 
            transform: expandedSection === 'settings' ? 'rotate(0deg)' : 'rotate(-90deg)' 
          }}>▼</span>
        </div>
        <div style={{ 
          maxHeight: expandedSection === 'settings' ? '500px' : '0', 
          overflow: 'hidden', transition: 'max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1)' 
        }}>
          {navItems.filter(i => i.section === 'settings').map(item => (
            <Link key={item.href} href={item.href} className={`nav-item ${isActive(item.href) ? 'active' : ''}`}>
              <span style={{ fontSize: 14, width: 18, textAlign: 'center' }}>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>
      </nav>

      {/* Bottom — User Info + Settings Dropdown + Logout */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>

        {/* User Info Row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ minWidth: 0 }}>
            {/* Username */}
            <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {profile?.full_name || user?.email?.split('@')[0] || 'User'}
            </div>
            {/* Role Badge */}
            {isSuperUser ? (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 20, padding: '2px 8px' }}>
                <span style={{ fontSize: 9 }}>⭐</span>
                <span style={{ fontSize: 9, color: '#60a5fa', fontWeight: 600, letterSpacing: 0.3 }}>Administrator</span>
              </div>
            ) : profile?.role === 'visitor' ? (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(156,163,175,0.15)', border: '1px solid rgba(156,163,175,0.3)', borderRadius: 20, padding: '2px 8px' }}>
                <span style={{ fontSize: 9 }}>👁</span>
                <span style={{ fontSize: 9, color: '#9ca3af', fontWeight: 600, letterSpacing: 0.3 }}>Visitor</span>
              </div>
            ) : (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 20, padding: '2px 8px' }}>
                <span style={{ fontSize: 9 }}>👤</span>
                <span style={{ fontSize: 9, color: '#34d399', fontWeight: 600, letterSpacing: 0.3 }}>User</span>
              </div>
            )}
          </div>

          {/* Gear Icon */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <button
              onClick={() => setSettingsMenuOpen(prev => !prev)}
              style={{
                background: settingsMenuOpen ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 6, width: 30, height: 30,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', fontSize: 14, transition: 'all 0.2s',
                color: 'rgba(255,255,255,0.6)'
              }}
              title="Settings"
            >
              ⚙
            </button>

            {/* Dropdown Menu */}
            {settingsMenuOpen && (
              <>
                <div onClick={() => setSettingsMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 98 }} />
                <div style={{
                  position: 'absolute', bottom: '100%', right: 0, marginBottom: 8,
                  background: '#1e2d3d', border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 10, overflow: 'hidden',
                  boxShadow: '0 -8px 24px rgba(0,0,0,0.4)', minWidth: 180, zIndex: 99
                }}>
                  <div style={{ padding: '8px 12px 6px', fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                    บัญชีของฉัน
                  </div>
                  {/* User Profile */}
                  <button
                    onClick={() => {
                      setSettingsMenuOpen(false)
                      router.push(`/dashboard/profile`)
                    }}
                    style={{
                      width: '100%', padding: '10px 14px', background: 'none',
                      border: 'none', borderTop: '1px solid rgba(255,255,255,0.06)',
                      color: 'rgba(255,255,255,0.75)', fontSize: 13, textAlign: 'left',
                      cursor: 'pointer', fontFamily: 'inherit',
                      display: 'flex', alignItems: 'center', gap: 10,
                      transition: 'background 0.15s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    <span style={{ fontSize: 15 }}>👤</span>
                    <div>
                      <div style={{ fontWeight: 500 }}>User Profile</div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>แก้ไขข้อมูลส่วนตัว</div>
                    </div>
                  </button>
                  {/* Change Password */}
                  <button
                    onClick={() => {
                      setSettingsMenuOpen(false)
                      router.push('/dashboard/profile?tab=security')
                    }}
                    style={{
                      width: '100%', padding: '10px 14px', background: 'none',
                      border: 'none', borderTop: '1px solid rgba(255,255,255,0.06)',
                      color: 'rgba(255,255,255,0.75)', fontSize: 13, textAlign: 'left',
                      cursor: 'pointer', fontFamily: 'inherit',
                      display: 'flex', alignItems: 'center', gap: 10,
                      transition: 'background 0.15s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    <span style={{ fontSize: 15 }}>🔑</span>
                    <div>
                      <div style={{ fontWeight: 500 }}>Change Password</div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>เปลี่ยนรหัสผ่าน</div>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

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
          <Link href="/dashboard" style={{ fontSize: 14, fontWeight: 600, color: '#fff', textDecoration: 'none' }}>DOWA IT System</Link>
        </div>

        <div style={{ flex: 1, overflow: 'auto' }}>
          {children}
        </div>
      </div>
    </div>
  )
}