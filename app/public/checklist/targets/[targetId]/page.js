import { cookies } from 'next/headers'
import Link from 'next/link'
import { getTargetHistoryPublic } from '@/app/actions/public-checklist'
import { CalendarView } from './CalendarView'
import { CloseSessionButton } from './CloseSessionButton'

const S = {
  page: {
    minHeight: '100vh',
    background: '#f1f5f9',
    padding: '24px 16px 96px',
    fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
  },
  wrap: {
    maxWidth: 980,
    margin: '0 auto',
    display: 'grid',
    gap: 18,
  },
  card: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 20,
    boxShadow: '0 2px 6px rgba(15,23,42,0.05)',
    overflow: 'hidden',
  },
}

export const metadata = {
  title: 'Target History | Public',
  description: 'Public view of target checklist history',
}

export default async function PublicTargetLandingPage({ params }) {
  const { targetId } = await params

  // 1. Security Check: 30-Minute Session
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get(`qr_session_${targetId}`)

  if (!sessionCookie || sessionCookie.value !== 'active') {
    return (
      <div style={{ ...S.page, background: '#0f172a', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ ...S.card, maxWidth: 420, width: '100%', padding: 28, textAlign: 'center', background: '#111827', borderColor: '#374151' }}>
          <div style={{ width: 64, height: 64, borderRadius: 999, background: 'rgba(245,158,11,0.12)', display: 'grid', placeItems: 'center', margin: '0 auto 18px' }}>
            <svg style={{ width: 32, height: 32, color: '#f59e0b' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#fff', margin: '0 0 8px' }}>Session Expired</h1>
          <p style={{ fontSize: 14, color: '#9ca3af', margin: '0 0 20px', lineHeight: 1.6 }}>เซสชันหมดอายุ เพื่อความปลอดภัยของข้อมูล กรุณาสแกน QR Code ที่ตัวอุปกรณ์ใหม่อีกครั้ง</p>
          <Link
            href="/"
            style={{ display: 'block', width: '100%', padding: '12px 16px', background: '#fff', color: '#111827', fontWeight: 700, borderRadius: 12, textDecoration: 'none' }}
          >
            กลับหน้าหลัก
          </Link>
        </div>
      </div>
    )
  }

  // 2. Fetch Data
  const result = await getTargetHistoryPublic(targetId)

  if (!result.success) {
    return (
      <div style={{ ...S.page, background: '#0f172a', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ ...S.card, maxWidth: 440, width: '100%', padding: 24, textAlign: 'center', background: 'rgba(127,29,29,0.25)', borderColor: 'rgba(248,113,113,0.45)' }}>
          <h1 style={{ color: '#fca5a5', fontWeight: 800, marginBottom: 8 }}>Error</h1>
          <p style={{ color: '#fecaca', marginBottom: 16 }}>{result.error}</p>
          <CloseSessionButton targetId={targetId} label="ปิดหน้าจอ" />
        </div>
      </div>
    )
  }

  const { target, templates, history } = result
  const warningText = result.warning || ''
  const noHistory = !history || history.length === 0

  return (
    <div style={S.page}>
      <div style={S.wrap}>

        {/* Header Section */}
        <div style={S.card}>
          <div style={{ background: 'linear-gradient(135deg, #1d4ed8, #2563eb)', padding: 24, color: '#fff' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <h1 style={{ fontSize: 38, fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>{target.name}</h1>
                <p style={{ color: '#dbeafe', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 18, marginTop: 4 }}>{target.target_code}</p>
              </div>
              <span style={{ background: 'rgba(30,64,175,0.48)', padding: '6px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700 }}>
                {target.target_type}
              </span>
            </div>
          </div>

          <div style={{ padding: 24, display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))' }}>
            <div>
              <p style={{ color: '#64748b', marginBottom: 4, fontSize: 14 }}>สถานที่ตั้ง (Location)</p>
              <p style={{ fontWeight: 700, color: '#0f172a', fontSize: 32 }}>{target.location || '-'}</p>
            </div>
            {target.metadata && Object.keys(target.metadata).length > 0 && (
              <div>
                <p style={{ color: '#64748b', marginBottom: 6, fontSize: 14 }}>ข้อมูลเพิ่มเติม</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {Object.entries(target.metadata).map(([k, v]) => (
                    <span key={k} style={{ background: '#f1f5f9', color: '#334155', padding: '4px 10px', borderRadius: 999, fontSize: 12, border: '1px solid #e2e8f0' }}>
                      {k}: {String(v)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* History Calendar Section */}
        <div style={{ ...S.card, padding: 24 }}>
          <h2 style={{ fontSize: 34, fontWeight: 800, color: '#0f172a', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg style={{ width: 22, height: 22, color: '#3b82f6' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            ประวัติการตรวจสอบ (Inspection History)
          </h2>

          {warningText ? (
            <div style={{ marginBottom: 12, borderRadius: 12, border: '1px solid #fcd34d', background: '#fef3c7', padding: '10px 14px', fontSize: 14, color: '#92400e' }}>
              {warningText}
            </div>
          ) : null}

          {noHistory ? (
            <div style={{ marginBottom: 12, borderRadius: 12, border: '1px solid #e2e8f0', background: '#f8fafc', padding: '12px 14px', fontSize: 14, color: '#475569' }}>
              ยังไม่พบประวัติการตรวจสอบสำหรับอุปกรณ์นี้
            </div>
          ) : null}

          <CalendarView templates={templates} history={history} />

          <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 12, color: '#64748b', paddingTop: 12, borderTop: '1px solid #f1f5f9' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 12, height: 12, borderRadius: 999, background: '#10b981', display: 'inline-block' }}></span> ปกติ (OK)</div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 12, height: 12, borderRadius: 999, background: '#f43f5e', display: 'inline-block' }}></span> ผิดปกติ (NG)</div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 12, height: 12, borderRadius: 999, background: '#f59e0b', display: 'inline-block' }}></span> รอตรวจสอบ/รอดำเนินการ</div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 12, height: 12, borderRadius: 999, background: '#cbd5e1', display: 'inline-block' }}></span> ไม่มีข้อมูล</div>
          </div>
        </div>

      </div>

      {/* Floating Action Button for Close */}
      <div style={{ position: 'fixed', bottom: 22, left: 0, right: 0, display: 'flex', justifyContent: 'center', padding: '0 12px', pointerEvents: 'none' }}>
        <div style={{ pointerEvents: 'auto', borderRadius: 999, boxShadow: '0 10px 20px rgba(15,23,42,0.25)' }}>
          <CloseSessionButton targetId={targetId} />
        </div>
      </div>
    </div>
  )
}
