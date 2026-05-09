'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { normalizeRole, ROLE_BADGE, canAccess, getRolePermissions, checkPermission } from '@/lib/auth'
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
  const [permissions, setPermissions] = useState([]) // 🛡️ เก็บสิทธิ์ Dynamic
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [expandedSection, setExpandedSection] = useState('operations')
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
        .select('role, full_name, is_active, is_onboarded, onboarding_token')
        .eq('id', sessionUser.id)
        .single()

      if (error || !profileData || profileData.is_active === false) {
        await supabase.auth.signOut()
        router.push('/?error=' + encodeURIComponent('บัญชีของคุณไม่ได้รับอนุญาต'))
        return
      }

      // 🛡️ Force Onboarding Check (Security Standard)
      if (profileData.is_onboarded === false) {
        const tokenParam = profileData.onboarding_token ? `?token=${profileData.onboarding_token}` : ''
        router.push(`/onboarding${tokenParam}`) // ดีดไปหน้า Onboarding พร้อม Token
        return
      }

      setProfile(profileData)
      const normalized = normalizeRole(profileData.role, sessionUser.email)
      
      if (!normalized) {
        await supabase.auth.signOut()
        router.push('/?error=' + encodeURIComponent('บัญชีถูกระงับ'))
        return
      }

      // 🛡️ ดึงสิทธิ์แบบ Dynamic
      const perms = await getRolePermissions(normalized, supabase)
      setPermissions(perms)

      setRole(normalized)
      setInitializing(false)

      // ตรวจสอบสิทธิ์เข้าหน้านี้ (ใช้ Logic เดิมผสมกับ Dynamic)
      // 🚨 เพิ่ม Admin Override เพื่อป้องกันการโดนล็อคหน้าจอเอง
      const featureKey = pathname.split('/')[2] || 'dashboard'
      const access = checkPermission(perms, featureKey)
      
      const isPublicPath = pathname === '/dashboard' || pathname.startsWith('/dashboard/profile')
      
      if (access === 'NONE' && normalized !== 'admin' && !isPublicPath) {
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
    { href: '/dashboard',                          label: 'Dashboard',       icon: '▦', section: 'operations', roles: ['admin','it_staff','approver','employee','auditor'] },
    { href: '/dashboard/incidents',                label: 'Incident',        icon: '⚠', section: 'operations', roles: ['admin','it_staff','approver','employee','auditor'] },
    { href: '/dashboard/reports/sla',             label: 'SLA Report',      icon: '📊', section: 'operations', roles: ['admin','it_staff','approver','auditor'] },
    { href: '/dashboard/backup',                   label: 'Backup Log',      icon: '☁', section: 'operations', roles: ['admin','it_staff','approver','auditor'] },
    { href: '/dashboard/checklist',                label: 'IT Checklist',    icon: '✅', section: 'operations', roles: ['admin','it_staff','approver','auditor'] },
    { href: '/dashboard/settings/no-series',       label: 'No. Series',      icon: '⚙', section: 'settings',   roles: ['admin','auditor'] },
    { href: '/dashboard/settings/master-data',     label: 'Master Data',     icon: '📋', section: 'settings',   roles: ['admin','auditor'] },
    { href: '/dashboard/settings/users',           label: 'Users',           icon: '👤', section: 'settings',   roles: ['admin','auditor'] },
    { href: '/dashboard/settings/logs',            label: 'System Logs',     icon: '📝', section: 'settings',   roles: ['admin','auditor'] },
    { href: '/dashboard/settings/permissions',     label: 'Permissions',     icon: '🛡️', section: 'settings',   roles: ['admin'] },
  ]

  const currentFeature = pathname.split('/')[2] || 'dashboard'
  const currentAccess = checkPermission(permissions, currentFeature)
  const isReadOnly = currentAccess === 'RO'

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
          {navItems.filter(i => i.section === 'operations').map(item => {
            const itemFeature = item.href.split('/')[2] || 'dashboard'
            const itemAccess = checkPermission(permissions, itemFeature)
            if (itemAccess === 'NONE') return null

            return (
              <Link key={item.href} href={item.href} className={`nav-item ${isActive(item.href) ? 'active' : ''}`}>
                <span style={{ fontSize: 14, width: 18, textAlign: 'center' }}>{item.icon}</span> {item.label}
              </Link>
            )
          })}
        </div>
        {(role === 'admin') && (
          <>
            <div onClick={() => toggleSection('settings')} className="nav-section-title">
              <span style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 700 }}>SETTINGS</span>
              <span style={{ transition: 'transform 0.3s', transform: expandedSection === 'settings' ? 'rotate(0deg)' : 'rotate(-90deg)', color: 'rgba(255,255,255,0.4)' }}>▼</span>
            </div>
            <div style={{ maxHeight: expandedSection === 'settings' ? '500px' : '0', overflow: 'hidden', transition: 'max-height 0.4s' }}>
              {navItems.filter(i => i.section === 'settings').map(item => {
                const itemFeature = item.href.split('/')[2] || 'dashboard'
                // สำหรับหน้า Settings เราจะเช็คสิทธิ์รวมของ 'settings' หรือเช็ครายหน้า
                const itemAccess = checkPermission(permissions, itemFeature)
                if (itemAccess === 'NONE' && role !== 'admin') return null // Admin เข้าได้เสมอเพื่อป้องกันการ Lockout

                return (
                  <Link key={item.href} href={item.href} className={`nav-item ${isActive(item.href) ? 'active' : ''}`}>
                    <span style={{ fontSize: 14, width: 18, textAlign: 'center' }}>{item.icon}</span> {item.label}
                  </Link>
                )
              })}
            </div>
          </>
        )}
      </nav>
      <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.08)', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {profile?.full_name || user?.email || 'User'}
            </div>
            {(() => {
              const badge = ROLE_BADGE[role] || ROLE_BADGE.auditor
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
                style={{ position: 'relative', borderTop: '1px solid rgba(255,255,255,0.08)', background: 'rgba(59, 130, 246, 0.05)', cursor: 'pointer', padding: '12px 16px' }}
              >
                <input type="date" value={getFormattedDate()} onChange={(e) => e.target.value && setWorkingDate(new Date(e.target.value))} style={{ position: 'absolute', opacity: 0, inset: 0, width: '100%', height: '100%', cursor: 'pointer', zIndex: 1 }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: '#fff', opacity: 0.9 }}>📅 WORKING DATE</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#60a5fa' }}>{formatDateMMM(getFormattedDate())}</div>
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
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', position: 'relative' }}>
      <style>{`
        .sidebar { background: #0f1923; width: 240px; flex-shrink: 0; color: #fff; display: flex; flex-direction: column; transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1); z-index: 1000; height: 100%; }
        .nav-item { display: flex; align-items: center; gap: 12px; padding: 10px 16px; color: rgba(255,255,255,0.7); text-decoration: none; font-size: 13px; transition: all 0.2s; border-left: 4px solid transparent; }
        .nav-item:hover { background: rgba(255,255,255,0.08); color: #fff; }
        .nav-item.active { background: rgba(29, 78, 216, 0.15); color: #fff; font-weight: 700; border-left-color: #3b82f6; }
        .nav-section-title { font-size: 10px; color: #fff; padding: 16px 16px 8px; text-transform: uppercase; display: flex; justify-content: space-between; cursor: pointer; letter-spacing: 1px; opacity: 0.8; }
        .gear-btn { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; width: 30px; height: 30px; color: #94a3b8; cursor: pointer; display: flex; align-items: center; justify-content: center; }
        .dropdown-item { width: 100%; padding: 12px 16px; background: none; border: none; color: #fff; text-align: left; cursor: pointer; font-size: 13px; }
        .dropdown-item:hover { background: rgba(255,255,255,0.1); }
        .logout-btn { width: 100%; padding: 8px; background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.8); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; font-size: 12px; cursor: pointer; margin-top: 8px; }
        
        .mobile-hamburger { display: none; }

        @media (max-width: 1024px) {
          .sidebar { position: absolute; top: 0; bottom: 0; left: 0; transform: translateX(-240px); }
          .sidebar.open { transform: translateX(0); box-shadow: 10px 0 30px rgba(0,0,0,0.4); }
          .mobile-hamburger { 
            display: flex; 
            position: absolute; 
            top: 16px; 
            left: 16px; 
            z-index: 50; 
            background: #fff; 
            width: 40px; 
            height: 40px; 
            border-radius: 10px; 
            align-items: center; 
            justify-content: center; 
            box-shadow: 0 4px 12px rgba(0,0,0,0.1); 
            border: none; 
            cursor: pointer;
            font-size: 20px;
          }
          .main-content { padding-top: 60px !important; }
        }

        .backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.6);
          backdrop-filter: blur(4px);
          z-index: 900;
          transition: opacity 0.3s;
        }
      `}</style>

      {/* Mobile Toggle Button */}
      <button className="mobile-hamburger" onClick={() => setSidebarOpen(true)}>☰</button>

      {/* Backdrop for Mobile */}
      {sidebarOpen && (
        <div className="backdrop" onClick={() => setSidebarOpen(false)}></div>
      )}

      {/* Sidebar with CSS classes */}
      <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <SidebarContent />
      </div>

      {/* Main Content Area */}
      <div className="main-content" style={{ 
        flex: 1, 
        overflow: 'auto', 
        background: '#f0f2f5',
        position: 'relative'
      }}>
        {isReadOnly && (
          <>
            {/* 🚩 แสดงแถบแดงเฉพาะ Auditor เท่านั้น */}
            {role === 'auditor' && (
              <div style={{
                position: 'sticky', top: 0, left: 0, right: 0, zIndex: 9999,
                background: 'linear-gradient(to right, #ef4444, #dc2626)', color: '#fff',
                padding: '6px 12px', fontSize: 11, fontWeight: 800, textAlign: 'center',
                letterSpacing: '1px', backdropFilter: 'blur(4px)',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
              }}>
                🔒 READ-ONLY MODE (AUDITOR) - คุณสามารถดูข้อมูลได้ แต่ไม่สามารถแก้ไขได้
              </div>
            )}
            <style>{`
              .main-content button:not(.nav-item), 
              .main-content input, 
              .main-content select, 
              .main-content textarea,
              .main-content [role="button"]:not(a) { 
                pointer-events: none !important; 
                opacity: 0.6 !important; 
                filter: grayscale(0.6) !important;
                cursor: not-allowed !important;
              }
              .main-content a {
                pointer-events: auto !important;
              }
            `}</style>
          </>
        )}
        {children}
      </div>
    </div>
  )
}