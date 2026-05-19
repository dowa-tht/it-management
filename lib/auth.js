import crypto from 'crypto'

// ============================================================
// lib/auth.js — Role definitions & access control
// ============================================================

// ฟังก์ชันสำหรับ Hash อีเมลเพื่อใช้ในระบบ Whitelist
export function hashEmail(email) {
  if (!email) return null
  return crypto.createHash('sha256').update(email.toLowerCase().trim()).digest('hex')
}

// Role Tiers
export const TIER1_ROLES = ['admin', 'it_staff']
export const TIER2_ROLES = ['approver', 'auditor', 'employee']
export const ALL_ROLES = [...TIER1_ROLES, ...TIER2_ROLES]

// Map ค่าเดิมในฐานข้อมูล → role ใหม่ในระบบ
export const ROLE_MAP = {
  admin:         'admin',
  superuser:     'admin',
  administrator: 'admin',
  it_staff:      'it_staff',
  supervisor:    'it_staff',
  it_member:     'it_staff',
  approver:      'approver',
  approval:      'approver',
  auditor:       'auditor',
  guest:         'auditor',
  visitor:       'auditor',
  employee:      'employee',
  member:        'employee',
  user:          'employee',
}

// สิทธิ์เข้าถึงแต่ละ Route
export const ROUTE_PERMISSIONS = {
  '/dashboard/settings/users':        ['admin'],
  '/dashboard/settings/logs':         ['admin', 'it_staff'],
  '/dashboard/settings/master-data':  ['admin'],
  '/dashboard/settings/incident-master-data':['admin'],
  '/dashboard/settings/checklist-master-data':['admin'],
  '/dashboard/settings/no-series':    ['admin'],
  '/dashboard/settings/working-hours':['admin'],
  '/dashboard/settings/holidays':     ['admin'],
  '/dashboard/settings/workflow':     ['admin'],
  '/dashboard/settings/substitutes':  ['admin'],
  '/dashboard/settings/permissions':  ['admin'],
  '/dashboard/settings':              ['admin'],
  '/dashboard/profile':               ['admin', 'it_staff', 'approver', 'employee', 'auditor'],
  '/dashboard/reports':               ['admin', 'it_staff', 'approver', 'auditor'],
  '/dashboard/incidents':             ['admin', 'it_staff', 'approver', 'employee', 'auditor'],
  '/dashboard/backup':                ['admin', 'it_staff', 'approver', 'auditor'],
  '/dashboard/checklist':             ['admin', 'it_staff', 'approver', 'auditor'],
  '/dashboard':                       ['admin', 'it_staff', 'approver', 'employee', 'auditor'],
  '/dashboard/my-pending':            ['admin', 'it_staff', 'approver', 'employee', 'auditor'],
  '/dashboard/approvals':             ['admin', 'it_staff', 'approver', 'employee', 'auditor'],
}

// ตรวจสอบว่า role นี้เข้า pathname ได้หรือไม่
export function canAccess(role, pathname) {
  const sorted = Object.entries(ROUTE_PERMISSIONS)
    .sort((a, b) => b[0].length - a[0].length)

  for (const [route, allowedRoles] of sorted) {
    if (pathname.startsWith(route)) {
      return allowedRoles.includes(role)
    }
  }
  return false
}

// รายชื่ออีเมลที่ต้องห้ามเข้าใช้งานระบบโดยเด็ดขาด
export const BLACKLIST_EMAILS = [
  // 'admin_dtt@dowa-tht.co.th',
]

// แปลง role เดิม → role ใหม่
export function normalizeRole(rawRole, email = null) {
  if (email && BLACKLIST_EMAILS.includes(email.toLowerCase())) {
    return null
  }
  if (!rawRole) return 'auditor'
  const role = rawRole.toLowerCase()
  return ROLE_MAP[role] || role
}

/**
 * 🛡️ ดึงข้อมูลสิทธิ์แบบ Dynamic จาก Database
 */
export async function getRolePermissions(role, supabase) {
  const { data, error } = await supabase
    .from('permission_sets')
    .select('feature_key, access_level')
    .eq('role_name', role)

  if (error || !data) return []
  return data
}

/**
 * 🔒 ตรวจสอบสิทธิ์แบบละเอียด (RW, RO, NONE)
 */
export function checkPermission(permissions, featureKey) {
  const perm = permissions?.find(p => p.feature_key === featureKey)
  return perm?.access_level || 'NONE'
}

// สีและ Label สำหรับแสดงผล Badge
export const ROLE_BADGE = {
  admin:    { label: 'Administrator', bg: '#fee2e2', color: '#991b1b', emoji: '👑' },
  it_staff: { label: 'IT Team',       bg: '#dbeafe', color: '#1e40af', emoji: '🛡️' },
  approver: { label: 'Approver',      bg: '#fef3c7', color: '#92400e', emoji: '✅' },
  employee: { label: 'Employee',      bg: '#eff6ff', color: '#1d4ed8', emoji: '👥' },
  auditor:  { label: 'Auditor',       bg: '#f3f4f6', color: '#374151', emoji: '👤' },
}
