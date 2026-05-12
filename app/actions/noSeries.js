'use server'
import { createClient } from '@supabase/supabase-js'
import { getNextNo } from '@/lib/noSeries'
import { getCurrentUserSession } from './user'

const getAdminClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

/**
 * 🚀 Server Action: ดึงเลขที่เอกสารชุดถัดไปแบบ Verified (ข้าม RLS)
 * ใช้สำหรับแสดงผลที่หน้า UI เพื่อให้มั่นใจว่าเป็นเลขที่ไม่ซ้ำแน่นอน
 */
export async function getVerifiedNextNo(code) {
  try {
    const session = await getCurrentUserSession()
    if (!session) return { error: 'Unauthorized' }

    const supabaseAdmin = getAdminClient()
    const result = await getNextNo(code, new Date(), supabaseAdmin)
    
    return { nextNo: result.nextNo, series: result.series, isLegacy: result.isLegacy }
  } catch (err) {
    console.error('getVerifiedNextNo Error:', err)
    return { error: err.message }
  }
}
