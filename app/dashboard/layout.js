'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { normalizeRole, ROLE_BADGE, canAccess } from '@/lib/auth'
import Link from 'next/link'
import { formatDateMMM } from '@/lib/dateFormat'
import { useWorkingDate } from '@/lib/context/WorkingDateContext'

export default function DashboardLayout({ children }) {
  const { workingDate, setWorkingDate, getFormattedDate } = useWorkingDate()
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [role, setRole] = useState(null) 
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [expandedSection, setExpandedSection] = useState('operations') // ✅ กาง Operations ไว้เป็นค่าเริ่มต้น
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false)
  const [initializing, setInitializing] = useState(true)

  useEffect(() => {
    const checkAccess = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        router.push('/')
        return
      }

      const sessionUser = session.user
      setUser(sessionUser)

      const { data: profileData, error } = await supabase
        .from('user_profiles')
        .select('role, full_name, is_active')
        .eq('id', sessionUser.id)
        .single()

      if (error || !profileData || profileData.is_active === false) {
        await supabase.auth.signOut()
        router.push('/?error=' + encodeURIComponent('บัญชีของคุณไม่ได้รับอนุญาต'))
        return
      }

      setProfile(profileData)
      const normalized = normalizeRole(profileData.role, sessionUser.email)
      
      if (!normalized) {
        await supabase.auth.signOut()
        router.push('/?error=' + encodeURIComponent('บัญชีถูกระงับ'))
        return
      }

      setRole(normalized)
      setInitializing(false)

      if (!canAccess(normalized, pathname)) {
        router.push('/dashboard?error=access_denied')
      }
    }

    checkAccess()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        router.push('/')
      }
    })

    return () => subscription?.unsubscribe()
  }, [pathname, router])

  // Auto-expand current section
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
          user_agent: navigator.userAgent.slice(0, 200)
        }])
      } catch {}
    }
    await supabase.auth.signOut()
    router.push('/')
  }

  const navItems = [
    { href: '/dashboard',                          label: 'Dashboard',       icon: '▦', section: 'operations', roles: ['administrator','supervisor','guest','approval'] },
    { href: '/dashboard/incidents',                label: 'Incident',        icon: '⚠', section: 'operations', roles: ['administrator','supervisor','guest','approval'] },
    { href: '/dashboard/reports/sla',             label: 'SLA Report',      icon: '📊', section: 'operations', roles: ['administrator','supervisor'] },
    { href: '/dashboard/backup',                   label: 'Backup Log',      icon: '☁', section: 'operations', roles: ['administrator','supervisor','guest','approval'] },
    { href: '/dashboard/checklist',                label: 'IT Checklist',    icon: '✅', section: 'operations', roles: ['administrator','supervisor','guest','approval'] },
    { href: '/dashboard/settings/no-series',       label: 'No. Series',      icon: '⚙', section: 'settings',   roles: ['administrator'] },
    { href: '/dashboard/settings/master-data',     label: 'Master Data',     icon: '📋', section: 'settings',   roles: ['administrator'] },
    { href: '/dashboard/settings/users',           label: 'Users',           icon: '👤', section: 'settings',   roles: ['administrator'] },
  ]

  const isActive = (href) => (href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href))

  const toggleSection = (section) => setExpandedSection(prev => prev === section ? null : section)

  if (initializing) return <div style={{ minHeight: '100vh', background: '#0f1923', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>Checking Security...</div>

  const SidebarContent = () => (
    <>
      <Link href="/dashboard" style={{ display: 'block', padding: '20px 16px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', textDecoration: 'none' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>DOWA IT</div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>Management System</div>
      </Link>
      <nav style={{ padding: '8px 0', flex: 1, overflowY: 'auto' }}>
        <div onClick={() => toggleSection('operations')} className="nav-section-title">
          <span style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 700 }}>OPERATIONS</span>
          <span style={{ transition: 'transform 0.3s', transform: expandedSection === 'operations' ? 'rotate(0deg)' : 'rotate(-90deg)', color: 'rgba(255,255,255,0.4)' }}>▼</span>
        </div>
        <div style={{ maxHeight: expandedSection === 'operations' ? '500px' : '0', overflow: 'hidden', transition: 'max-height 0.4s' }}>
          {navItems.filter(i => i.section === 'operations' && (role ? i.roles.includes(role) : false)).map(item => (
            <Link key={item.href} href={item.href} className={`nav-item ${isActive(item.href) ? 'active' : ''}`}>
              <span style={{ fontSize: 14, width: 18, textAlign: 'center' }}>{item.icon}</span> {item.label}
            </Link>
          ))}
        </div>
        {(role === 'administrator') && (
          <>
            <div onClick={() => toggleSection('settings')} className="nav-section-title">
              <span style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 700 }}>SETTINGS</span>
              <span style={{ transition: 'transform 0.3s', transform: expandedSection === 'settings' ? 'rotate(0deg)' : 'rotate(-90deg)', color: 'rgba(255,255,255,0.4)' }}>▼</span>
            </div>
            <div style={{ maxHeight: expandedSection === 'settings' ? '500px' : '0', overflow: 'hidden', transition: 'max-height 0.4s' }}>
              {navItems.filter(i => i.section === 'settings').map(item => (
                <Link key={item.href} href={item.href} className={`nav-item ${isActive(item.href) ? 'active' : ''}`}>
                  <span style={{ fontSize: 14, width: 18, textAlign: 'center' }}>{item.icon}</span> {item.label}
                </Link>
              ))}
            </div>
          </>
        )}
      </nav>
      <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.08)', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {profile?.full_name || 'User'}
            </div>
            {(() => {
              const badge = ROLE_BADGE[role] || ROLE_BADGE.guest
              return (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 20, padding: '2px 8px', marginTop: 4 }}>
                  <span style={{ fontSize: 9 }}>{badge.emoji}</span>
                  <span style={{ fontSize: 9, color: '#94a3b8', fontWeight: 600 }}>{badge.label}</span>
                </div>
              )
            })()}
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button onClick={() => setSettingsMenuOpen(!settingsMenuOpen)} className="gear-btn">⚙</button>
          </div>
          {settingsMenuOpen && (
            <div style={{ position: 'absolute', bottom: '100%', left: 16, right: 16, background: '#1e2d3d', borderRadius: 12, boxShadow: '0 -8px 24px rgba(0,0,0,0.5)', zIndex: 100, marginBottom: 8, border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden' }}>
              <button onClick={() => { setSettingsMenuOpen(false); router.push('/dashboard/profile') }} className="dropdown-item">👤 My Profile</button>
              
              <div 
                onClick={(e) => {
                  const input = e.currentTarget.querySelector('input');
                  if (input) input.showPicker();
                }}
                style={{ 
                  position: 'relative', 
                  borderTop: '1px solid rgba(255,255,255,0.08)', 
                  background: 'rgba(59, 130, 246, 0.05)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  padding: '12px 16px'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.05)'}
              >
                <input 
                  type="date" 
                  value={getFormattedDate()}
                  onChange={(e) => {
                    if (e.target.value) {
                      setWorkingDate(new Date(e.target.value));
                    }
                  }}
                  style={{ position: 'absolute', opacity: 0, inset: 0, width: '100%', height: '100%', cursor: 'pointer', zIndex: 1 }} 
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: '#fff', opacity: 0.9 }}>
                    <span style={{ fontSize: 16 }}>📅</span> WORKING DATE
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 24 }}>
                    <div style={{ 
                      fontSize: 11, 
                      fontWeight: 700, 
                      color: '#60a5fa', 
                      background: 'rgba(59, 130, 246, 0.1)', 
                      padding: '5px 10px', 
                      borderRadius: 6,
                      border: '1px solid rgba(59, 130, 246, 0.2)',
                      whiteSpace: 'nowrap',
                      lineHeight: 1
                    }}>
                      {formatDateMMM(getFormattedDate())}
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setWorkingDate(new Date());
                      }}
                      title="Reset to current date"
                      style={{
                        position: 'relative',
                        zIndex: 10,
                        background: 'none',
                        border: 'none',
                        color: 'rgba(255,255,255,0.3)',
                        fontSize: 16,
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s',
                        borderRadius: 6,
                        lineHeight: 1
                      }}
                      onMouseEnter={e => { e.currentTarget.style.color = '#60a5fa'; e.currentTarget.style.transform = 'rotate(180deg)' }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; e.currentTarget.style.transform = 'rotate(0deg)' }}
                    >
                      ↻
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
        <button onClick={handleLogout} className="logout-btn">ออกจากระบบ</button>
      </div>
    </>
  )

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <style>{`
        .sidebar { background: #0f1923; width: 220px; flex-shrink: 0; color: #fff; display: flex; flex-direction: column; transition: all 0.3s; }
        .nav-item { display: flex; align-items: center; gap: 12px; padding: 10px 16px; color: rgba(255,255,255,0.7); text-decoration: none; font-size: 13px; transition: all 0.2s; }
        .nav-item:hover { background: rgba(255,255,255,0.08); color: #fff; }
        .nav-item.active { background: #1d4ed8; color: #fff; font-weight: 700; border-right: 4px solid #fff; }
        .nav-section-title { font-size: 10px; color: #fff; padding: 16px 16px 8px; text-transform: uppercase; display: flex; justify-content: space-between; cursor: pointer; letter-spacing: 1px; opacity: 0.8; }
        .gear-btn { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; width: 30px; height: 30px; color: #94a3b8; cursor: pointer; display: flex; align-items: center; justify-content: center; }
        .dropdown-item { width: 100%; padding: 12px 16px; background: none; border: none; color: #fff; text-align: left; cursor: pointer; font-size: 13px; }
        .dropdown-item:hover { background: rgba(255,255,255,0.1); }
        .logout-btn { width: 100%; padding: 8px; background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.8); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; font-size: 12px; cursor: pointer; margin-top: 8px; }
      `}</style>
      <div className="sidebar mobile-hide"><SidebarContent /></div>
      <div style={{ flex: 1, overflow: 'auto', background: '#f0f2f5' }}>{children}</div>
    </div>
  )
}