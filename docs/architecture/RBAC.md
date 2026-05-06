# RBAC Implementation Plan
## Dowa IT System — User Management & Security

> Version: 1.0 | Date: 2026-04-29  
> Standard: NIST SP 800-63B · OWASP ASVS · ISO/IEC 27001

---

## 1. System Overview

### Identity Architecture (Dual-Tier)

```
Tier 1: Supabase Auth  →  administrator, supervisor
         (Email + Password + JWT Session)

Tier 2: Custom Table   →  approval, guest
         (Signed Token / Email Link)

Bridge:  user_registry →  Audit trail ข้าม Tier
```

### Role Summary

| Role | สิทธิ์ | Identity |
|---|---|---|
| **administrator** | ทำทุกอย่างได้ | Supabase Auth |
| **supervisor** | ทุกอย่างยกเว้น Settings | Supabase Auth |
| **approval** | ดูและ Approve เอกสารที่ได้รับ Link เท่านั้น | Token (Email Link) |
| **guest** | Read-only ยกเว้น Settings/Security menus | Token (Time-limited) |

### Permission Matrix

| Route | administrator | supervisor | approval | guest |
|---|:---:|:---:|:---:|:---:|
| `/dashboard` | ✅ | ✅ | ❌ | ✅ |
| `/dashboard/incidents` | ✅ Full | ✅ Full | ❌ | ✅ Read |
| `/dashboard/backup` | ✅ Full | ✅ Full | ❌ | ✅ Read |
| `/dashboard/checklist` | ✅ Full | ✅ Full | ❌ | ✅ Read |
| `/dashboard/profile` | ✅ | ✅ | ❌ | ❌ |
| `/dashboard/settings/*` | ✅ | ❌ | ❌ | ❌ |
| `/approve?token=` | ❌ | ❌ | ✅ | ❌ |
| `/guest-access?token=` | ❌ | ❌ | ❌ | ✅ |
| `/reset-pin?token=` | ✅ | ✅ | ✅ | ✅ |

---

## 2. Tools & Dependencies

| เครื่องมือ | วัตถุประสงค์ | ราคา |
|---|---|---|
| Supabase Auth | Tier 1 identity | ฟรี |
| Supabase DB | เก็บข้อมูล + RLS | ฟรี |
| Resend.com | Email (Approval/PIN/Guest) | ฟรี 3,000/เดือน |
| bcryptjs | Hash PIN (4-6 หลัก) | ฟรี (npm) |
| Next.js middleware | Server-side route guard | ฟรี |

### Install Commands
```bash
npm install resend bcryptjs
```

### Environment Variables (.env.local)
```env
NEXT_PUBLIC_SUPABASE_URL=<มีอยู่แล้ว>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<มีอยู่แล้ว>
SUPABASE_SERVICE_ROLE_KEY=<มีอยู่แล้ว>
RESEND_API_KEY=re_xxxxxxxxxxxx   # สมัครที่ resend.com แล้ว copy มาวาง
```

---

## 3. File Structure

```
dowa-it-system/
├── middleware.js                              [NEW] Server-side route protection
├── .env.local                                 [MODIFY] + RESEND_API_KEY
│
├── lib/
│   ├── supabase.js                            [ไม่เปลี่ยน]
│   ├── supabaseAdmin.js                       [NEW] Admin client (Service Role)
│   └── auth.js                                [NEW] Role helpers + canAccess()
│
├── app/
│   ├── approve/
│   │   └── page.js                            [NEW] Approval link handler
│   ├── guest-access/
│   │   └── page.js                            [NEW] Guest token entry point
│   ├── reset-pin/
│   │   └── page.js                            [NEW] PIN reset form
│   │
│   ├── actions/
│   │   ├── admin.js                           [MODIFY] เพิ่ม PIN + role ใหม่
│   │   └── externalUsers.js                   [NEW] Approval/Guest actions
│   │
│   ├── api/
│   │   ├── users/
│   │   │   ├── create/route.js                [NEW] สร้าง user + limit check
│   │   │   └── change-role/route.js           [NEW] Cross-tier migration
│   │   ├── approval/
│   │   │   ├── send/route.js                  [NEW] สร้าง token + send email
│   │   │   └── verify/route.js                [NEW] ตรวจ token + บันทึก
│   │   ├── guest/
│   │   │   └── toggle/route.js                [NEW] Enable/Disable + duration
│   │   └── pin/
│   │       ├── reset-request/route.js         [NEW] ส่ง PIN reset email
│   │       └── reset-confirm/route.js         [NEW] Hash + บันทึก PIN ใหม่
│   │
│   └── dashboard/
│       ├── layout.js                          [MODIFY] Role badges ครบ 4 roles
│       └── settings/
│           └── users/
│               └── page.js                    [MODIFY] UI ใหม่ครบทุก role
```

---

## 4. Database Schema (SQL)

### Run ใน Supabase Dashboard → SQL Editor

```sql
-- =============================================
-- TABLE 1: external_users (Tier 2 Identity)
-- =============================================
CREATE TABLE public.external_users (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email                TEXT NOT NULL UNIQUE,
  full_name            TEXT NOT NULL,
  role                 TEXT NOT NULL CHECK (role IN ('approval', 'guest')),

  -- Access Control
  access_token         TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  access_duration_days INTEGER DEFAULT 7,
  expires_at           TIMESTAMPTZ,
  is_active            BOOLEAN DEFAULT true,

  -- PIN (optional)
  pin_hash             TEXT,
  pin_reset_token      TEXT,
  pin_reset_expires    TIMESTAMPTZ,

  -- Audit
  created_by           UUID REFERENCES auth.users(id),
  created_at           TIMESTAMPTZ DEFAULT now(),
  last_accessed_at     TIMESTAMPTZ,
  disabled_at          TIMESTAMPTZ,
  notes                TEXT
);

-- =============================================
-- TABLE 2: approval_tokens (Multi-document)
-- =============================================
CREATE TABLE public.approval_tokens (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id      UUID NOT NULL,
  document_type    TEXT NOT NULL CHECK (document_type IN (
                     'incident_report', 'backup_report',
                     'it_checklist', 'general'
                   )),
  document_title   TEXT,
  token            TEXT NOT NULL UNIQUE
                     DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at       TIMESTAMPTZ NOT NULL
                     DEFAULT (now() + INTERVAL '7 days'),
  used_at          TIMESTAMPTZ,
  approver_email   TEXT NOT NULL,
  approver_name    TEXT,
  external_user_id UUID REFERENCES external_users(id),
  action           TEXT CHECK (action IN ('approved','rejected','pending'))
                     DEFAULT 'pending',
  comment          TEXT,
  approved_at      TIMESTAMPTZ,
  created_by       UUID REFERENCES auth.users(id),
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- TABLE 3: user_registry (Bridge Table)
-- =============================================
CREATE TABLE public.user_registry (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email                 TEXT NOT NULL UNIQUE,
  full_name             TEXT NOT NULL,
  current_role          TEXT NOT NULL CHECK (current_role IN (
                          'administrator','supervisor','approval','guest'
                        )),
  supabase_user_id      UUID,
  external_user_id      UUID,
  is_active             BOOLEAN DEFAULT true,
  last_role_changed_at  TIMESTAMPTZ,
  last_role_changed_by  UUID,
  created_by            UUID,
  created_at            TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- TABLE 4: user_limits
-- =============================================
CREATE TABLE public.user_limits (
  id            SERIAL PRIMARY KEY,
  max_total     INTEGER DEFAULT 50,
  max_per_day   INTEGER DEFAULT 5,
  max_per_month INTEGER DEFAULT 10,
  updated_at    TIMESTAMPTZ DEFAULT now()
);
INSERT INTO public.user_limits (max_total, max_per_day, max_per_month)
VALUES (50, 5, 10);

-- =============================================
-- ALTER: user_profiles — เพิ่ม PIN columns
-- =============================================
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS pin_hash          TEXT,
  ADD COLUMN IF NOT EXISTS pin_reset_token   TEXT,
  ADD COLUMN IF NOT EXISTS pin_reset_expires TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS department        TEXT,
  ADD COLUMN IF NOT EXISTS employee_id       TEXT;

-- =============================================
-- MIGRATE: visitor users → external_users
-- =============================================
-- Step 1: ดู visitor users ที่มีอยู่ก่อน
SELECT up.id, up.full_name, up.role, au.email
FROM user_profiles up
JOIN auth.users au ON au.id = up.id
WHERE up.role = 'visitor';

-- Step 2: Insert เข้า external_users (ทำทีละ user)
-- แทนที่ <EMAIL> และ <NAME> ด้วยข้อมูลจริง
INSERT INTO external_users (email, full_name, role, access_duration_days, is_active)
VALUES ('<EMAIL>', '<NAME>', 'guest', 30, true);

-- Step 3: Disable Supabase account ของ visitor เดิม
-- ทำใน Supabase Auth Dashboard → Users → Ban user
-- หรือผ่าน Admin API: supabaseAdmin.auth.admin.updateUserById(id, { ban_duration: 'none' })
```

---

## 5. Key Code Templates

### 5.1 lib/supabaseAdmin.js
```javascript
import { createClient } from '@supabase/supabase-js'

export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing Supabase Admin credentials')
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
}
```

### 5.2 lib/auth.js
```javascript
// Role Tier definitions
export const TIER1_ROLES = ['administrator', 'supervisor']
export const TIER2_ROLES = ['approval', 'guest']

// Map role เก่า → ใหม่
export const ROLE_MAP = {
  superuser: 'administrator',
  user:      'supervisor',
  visitor:   'guest',
}

// Route permissions
export const ROUTE_PERMISSIONS = {
  '/dashboard/settings': ['administrator'],
  '/dashboard/settings/users': ['administrator'],
  '/dashboard/settings/master-data': ['administrator'],
  '/dashboard/settings/no-series': ['administrator'],
  '/dashboard/settings/working-hours': ['administrator'],
  '/dashboard/profile': ['administrator', 'supervisor'],
  '/dashboard': ['administrator', 'supervisor', 'guest'],
  '/dashboard/incidents': ['administrator', 'supervisor', 'guest'],
  '/dashboard/backup': ['administrator', 'supervisor', 'guest'],
  '/dashboard/checklist': ['administrator', 'supervisor', 'guest'],
}

export function canAccess(role, pathname) {
  // ตรวจจาก specific → general
  const sorted = Object.entries(ROUTE_PERMISSIONS)
    .sort((a, b) => b[0].length - a[0].length)
  for (const [route, allowedRoles] of sorted) {
    if (pathname.startsWith(route)) {
      return allowedRoles.includes(role)
    }
  }
  return false
}
```

### 5.3 middleware.js
```javascript
import { NextResponse } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { canAccess, ROLE_MAP } from '@/lib/auth'

export async function middleware(req) {
  const res = NextResponse.next()
  const pathname = req.nextUrl.pathname

  // ข้าม public routes
  if (!pathname.startsWith('/dashboard')) return res

  const supabase = createMiddlewareClient({ req, res })
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  // ดึง role จาก user_profiles
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()

  const rawRole = profile?.role || 'user'
  const role = ROLE_MAP[rawRole] || rawRole

  if (!canAccess(role, pathname)) {
    return NextResponse.redirect(new URL('/dashboard?error=access_denied', req.url))
  }

  return res
}

export const config = {
  matcher: ['/dashboard/:path*']
}
```

### 5.4 app/api/users/create/route.js
```javascript
import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { TIER1_ROLES, TIER2_ROLES } from '@/lib/auth'

export async function POST(req) {
  try {
    const body = await req.json()
    const { email, full_name, role, password, access_duration_days, pin } = body
    const admin = getSupabaseAdmin()

    // Check user limit
    const { data: limits } = await admin.from('user_limits').select('*').single()
    const { count: totalCount } = await admin.from('user_registry').select('*', { count: 'exact', head: true })
    if (totalCount >= limits.max_total) {
      return NextResponse.json({ error: `ระบบมี User ครบ ${limits.max_total} คนแล้ว` }, { status: 400 })
    }

    // Daily limit check
    const today = new Date().toISOString().split('T')[0]
    const { count: todayCount } = await admin.from('user_registry')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today)
    if (todayCount >= limits.max_per_day) {
      return NextResponse.json({ error: `สร้าง User ได้สูงสุด ${limits.max_per_day} คน/วัน` }, { status: 400 })
    }

    let supabaseUserId = null
    let externalUserId = null

    if (TIER1_ROLES.includes(role)) {
      // สร้าง Supabase Auth user
      const { data, error } = await admin.auth.admin.createUser({
        email, password,
        email_confirm: true,
        user_metadata: { full_name }
      })
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      supabaseUserId = data.user.id

      // สร้าง user_profiles
      await admin.from('user_profiles').upsert({
        id: supabaseUserId, full_name,
        role: role === 'administrator' ? 'superuser' : 'user',
        is_active: true
      })
    } else {
      // สร้าง external_users
      const expiresAt = access_duration_days
        ? new Date(Date.now() + access_duration_days * 86400000).toISOString()
        : null
      const { data, error } = await admin.from('external_users').insert({
        email, full_name, role,
        access_duration_days,
        expires_at: expiresAt,
        is_active: true
      }).select().single()
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      externalUserId = data.id
    }

    // บันทึก user_registry
    await admin.from('user_registry').insert({
      email, full_name,
      current_role: role,
      supabase_user_id: supabaseUserId,
      external_user_id: externalUserId,
      is_active: true
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
```

### 5.5 app/api/approval/send/route.js
```javascript
import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req) {
  try {
    const { document_id, document_type, document_title, approver_email, approver_name } = await req.json()
    const admin = getSupabaseAdmin()

    // สร้าง approval token
    const { data: token, error } = await admin
      .from('approval_tokens')
      .insert({ document_id, document_type, document_title, approver_email, approver_name })
      .select().single()
    if (error) throw error

    const approveUrl = `${process.env.NEXT_PUBLIC_APP_URL}/approve?token=${token.token}`

    // ส่ง Email
    await resend.emails.send({
      from: 'DOWA IT System <noreply@resend.dev>',
      to: approver_email,
      subject: `[DOWA IT] ขอให้ท่านยืนยันเอกสาร: ${document_title}`,
      html: `
        <div style="font-family:sans-serif;max-width:500px">
          <h2>แจ้งเตือนการยืนยันเอกสาร</h2>
          <p>เรียน คุณ${approver_name || approver_email}</p>
          <p>มีเอกสาร <strong>${document_title}</strong> รอการยืนยันจากท่าน</p>
          <p>กรุณาคลิกปุ่มด้านล่างเพื่อดูเอกสารและยืนยัน:</p>
          <a href="${approveUrl}" style="display:inline-block;padding:12px 24px;background:#1d4ed8;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
            ยืนยันเอกสาร
          </a>
          <p style="color:#6b7280;font-size:12px;margin-top:16px">
            Link นี้จะหมดอายุใน 7 วัน หากท่านไม่ได้ร้องขอ กรุณาแจ้ง IT Admin
          </p>
        </div>
      `
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
```

### 5.6 PIN Hash Pattern (ใช้ใน API routes)
```javascript
import bcrypt from 'bcryptjs'

// Hash PIN ก่อนบันทึก
export async function hashPin(pin) {
  return bcrypt.hash(pin, 12)
}

// ตรวจสอบ PIN
export async function verifyPin(pin, hash) {
  return bcrypt.compare(pin, hash)
}
```

---

## 6. Guest Status Logic

```javascript
// ใช้ใน Users page เพื่อแสดง status badge
export function getGuestStatus(user) {
  if (!user.is_active) return { label: 'Disabled', color: '#6b7280', bg: '#f3f4f6', emoji: '⚫' }
  if (!user.expires_at) return { label: 'Active', color: '#059669', bg: '#d1fae5', emoji: '🟢' }
  const now = new Date()
  const expires = new Date(user.expires_at)
  const diffDays = Math.ceil((expires - now) / 86400000)
  if (diffDays < 0) return { label: 'Expired', color: '#dc2626', bg: '#fee2e2', emoji: '🔴' }
  if (diffDays <= 2) return { label: `หมดอายุใน ${diffDays} วัน`, color: '#d97706', bg: '#fffbeb', emoji: '🟡' }
  return { label: `Active (${diffDays} วัน)`, color: '#059669', bg: '#d1fae5', emoji: '🟢' }
}
```

---

## 7. Cross-Tier Role Migration

### Admin/Supervisor → Approval/Guest
```
1. supabase.auth.admin.signOut(userId)          // Revoke sessions
2. update user_profiles: is_active = false      // Disable Supabase account
3. INSERT external_users                        // สร้าง Tier 2 record
4. UPDATE user_registry: current_role = ใหม่   // อัปเดต bridge table
5. ส่ง Email พร้อม Token/Link ใหม่
```

### Approval/Guest → Admin/Supervisor
```
1. UPDATE external_users: is_active = false     // Revoke token
2. supabase.auth.admin.createUser(email)        // สร้าง Supabase account ใหม่
3. supabase.auth.admin.generateLink('recovery') // ส่ง set-password email
4. UPDATE user_registry: current_role = ใหม่   // อัปเดต bridge table
```

> ⚠️ **กฎสำคัญ:** ห้ามลบ record เก่าใดๆ — ให้ Disable เท่านั้น เพื่อรักษา Audit Trail

---

## 8. Resend.com Setup Steps

1. ไปที่ [resend.com](https://resend.com) → Sign Up (ฟรี)
2. Dashboard → API Keys → Create API Key
3. Copy key มาใส่ `.env.local`:  `RESEND_API_KEY=re_xxxxxxx`
4. ใส่ใน Vercel Environment Variables ด้วย
5. (Optional) Verify domain เพื่อส่งจาก custom email แทน `resend.dev`

---

## 9. Implementation Order (แนะนำ)

```
Week 1:
  Day 1  → Phase 1: Run SQL ใน Supabase
  Day 2  → Phase 2: middleware.js + lib/auth.js + lib/supabaseAdmin.js
  Day 3  → Phase 2: แก้ dashboard/layout.js (roles ใหม่)

Week 2:
  Day 4  → Phase 3: แก้ settings/users/page.js (UI ใหม่)
  Day 5  → Phase 4: app/approve/page.js
  Day 6  → Phase 4: app/guest-access/page.js + app/reset-pin/page.js

Week 3:
  Day 7  → Phase 5: API routes ทั้งหมด
  Day 8  → Phase 5: Email integration (Resend)
  Day 9  → Testing & QA
  Day 10 → Deploy + Migrate visitor users
```

---

## 10. User Limits Config

```
Max users ในระบบ : 50
Max สร้าง/วัน   : 5
Max สร้าง/เดือน : 10

Tier 1 (Admin/Supervisor) : แนะนำ max 20
Tier 2 (Approval/Guest)   : แนะนำ max 30
```
