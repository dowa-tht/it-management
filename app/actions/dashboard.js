'use server'
import { createClient } from '@supabase/supabase-js'

export async function getDashboardData(timezoneOffset = -420) {
  try {
    // สร้าง Supabase Admin Client เพื่อดึงข้อมูล Dashboard (Bypass RLS)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl) {
      console.error('Missing NEXT_PUBLIC_SUPABASE_URL');
      return { error: 'ไม่พบตัวแปร NEXT_PUBLIC_SUPABASE_URL ใน Environment Variables ของ Vercel' }
    }
    if (!supabaseServiceKey) {
      console.error('Missing SUPABASE_SERVICE_ROLE_KEY');
      return { error: 'ไม่พบตัวแปร SUPABASE_SERVICE_ROLE_KEY ใน Environment Variables ของ Vercel (กรุณาเพิ่มค่านี้เพื่อให้ Dashboard ทำงานได้)' }
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // timezoneOffset is used to calculate "today" correctly for the user's local time if needed
    // Defaults to -420 for UTC+7 (Bangkok)
    const start = new Date()
    start.setMonth(start.getMonth() - 1)
    const startIso = start.toISOString()

    // For today string (YYYY-MM-DD), we should use a rough local date to match what checklist period_date stores
    const todayDate = new Date(new Date().getTime() - (timezoneOffset * 60000))
    const todayStr = todayDate.toISOString().split('T')[0]

    // Fetch data for the last 35 days for Checklist Streak and Monthly calculation
    const streakStart = new Date()
    streakStart.setDate(streakStart.getDate() - 35)
    const streakStartStr = streakStart.toISOString().split('T')[0]

    const [incRes, bakRes, chkRes, holidayRes] = await Promise.all([
      supabaseAdmin.from('incidents').select('id, case_number, title, severity, status, created_at, affected_system').gte('created_at', startIso).order('created_at', { ascending: false }),
      supabaseAdmin.from('backup_logs').select('id, log_date, system_name, status, notes').gte('log_date', startIso.split('T')[0]).order('log_date', { ascending: false }),
      supabaseAdmin.from('checklist_docs').select('id, status, freq_type, period_date, checklist_items(id, status)').gte('period_date', streakStartStr),
      supabaseAdmin.from('holidays').select('holiday_date').gte('holiday_date', streakStartStr)
    ])

    if (incRes.error) console.error('Incidents Fetch Error:', incRes.error)
    if (bakRes.error) console.error('Backups Fetch Error:', bakRes.error)
    if (chkRes.error) console.error('Checklists Fetch Error:', chkRes.error)

    const incidents = incRes.data || []
    const backups = bakRes.data || []
    const allChecklists = chkRes.error ? [] : (chkRes.data || [])
    const holidays = holidayRes.error ? [] : (holidayRes.data?.map(h => h.holiday_date) || [])

    // Filter checklists for "Today" to keep backward compatibility
    const checklists = allChecklists.filter(c => c.period_date === todayStr)

    // Calculate Health Streak (Last 7 Working Days)
    const streak = []
    let cursorDate = new Date(todayDate)
    
    // We go backwards to find 7 valid working days
    while (streak.length < 7 && cursorDate >= streakStart) {
      const dStr = cursorDate.toISOString().split('T')[0]
      const dayOfWeek = cursorDate.getDay() // 0 = Sun, 6 = Sat
      
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
      const isHoliday = holidays.includes(dStr)

      if (isWeekend || isHoliday) {
        streak.unshift({ date: dStr, status: 'skip', label: isWeekend ? 'Weekend' : 'Holiday', ngCount: 0 })
      } else {
        // It's a working day
        const dailyDoc = allChecklists.find(c => c.period_date === dStr && c.freq_type === 'Daily')
        if (!dailyDoc) {
          streak.unshift({ date: dStr, status: 'missed', label: 'Missed', ngCount: 0 })
        } else {
          const items = dailyDoc.checklist_items || []
          const hasNG = items.some(i => i.status === 'NG')
          const ngCount = items.filter(i => i.status === 'NG').length
          
          if (dailyDoc.status === 'Closed') {
            streak.unshift({ date: dStr, status: hasNG ? 'ng' : 'ok', label: hasNG ? `พบ ${ngCount} ปัญหา (NG)` : 'ตรวจครบถ้วน', ngCount })
          } else {
            // It's Open
            const hasProgress = items.some(i => i.status !== null)
            if (hasProgress) {
              streak.unshift({ date: dStr, status: 'in-progress', label: 'กำลังดำเนินการ', ngCount })
            } else {
              streak.unshift({ date: dStr, status: 'pending', label: 'รอตรวจสอบ', ngCount: 0 })
            }
          }
        }
      }
      cursorDate.setDate(cursorDate.getDate() - 1)
    }

    // Keep only the last 7 to be exact
    const finalStreak = streak.slice(-7)

    // Calculate other Action Cards data (Weekly / Monthly)
    const getCardStatus = (doc) => {
      if (!doc) return { status: 'pending', label: 'ยังไม่ได้ดำเนินการ', ngCount: 0 }
      
      const items = doc.checklist_items || []
      const ngCount = items.filter(i => i.status === 'NG').length
      const hasProgress = items.some(i => i.status !== null)

      if (doc.status === 'Closed') {
        return { status: ngCount > 0 ? 'ng' : 'done', label: ngCount > 0 ? `พบ ${ngCount} ปัญหา (NG)` : 'ตรวจเสร็จสมบูรณ์', ngCount }
      }
      
      if (hasProgress) return { status: 'in-progress', label: 'กำลังดำเนินการ', ngCount }
      return { status: 'pending', label: 'รอการตรวจสอบ', ngCount: 0 }
    }

    const weeklyDoc = allChecklists.find(c => c.freq_type === 'Weekly' && new Date(c.period_date) >= new Date(todayDate.getTime() - 7*24*60*60*1000))
    const monthlyDoc = allChecklists.find(c => c.freq_type === 'Monthly' && c.period_date.startsWith(todayStr.substring(0, 7)))

    const checklistActions = {
      dailyStatus: finalStreak[finalStreak.length - 1], // Today
      weeklyStatus: getCardStatus(weeklyDoc),
      monthlyStatus: getCardStatus(monthlyDoc),
      streak: finalStreak
    }

    // Aggregate Data to reduce payload size
    const totalIncidents = incidents.length
    const highSeverity = incidents.filter(i => i.severity === 'High').length
    const inProgress = incidents.filter(i => i.status === 'In Progress').length
    const openIncidents = incidents.filter(i => i.status === 'Open').length
    
    const backupSuccessRate = backups.length
      ? Math.round((backups.filter(b => b.status === 'Success').length / backups.length) * 100)
      : 0

    // Incident 7 days chart data
    const chartMap = {}
    incidents.forEach(i => {
      try {
        const d = new Date(i.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
        chartMap[d] = (chartMap[d] || 0) + 1
      } catch (e) {
        console.error('Date parsing error for incident:', i.id, e)
      }
    })
    const incidentByDay = Object.entries(chartMap).slice(-7).map(([date, count]) => ({ date, count }))

    // Severity Breakdown
    const severityData = [
      { name: 'High', value: highSeverity, color: '#ef4444' },
      { name: 'Medium', value: incidents.filter(i => i.severity === 'Medium').length, color: '#f59e0b' },
      { name: 'Low', value: incidents.filter(i => i.severity === 'Low').length, color: '#10b981' },
    ].filter(d => d.value > 0)

    return {
      stats: {
        totalIncidents,
        highSeverity,
        inProgress,
        openIncidents,
        backupSuccessRate
      },
      incidentByDay,
      severityData,
      recentIncidents: incidents.slice(0, 5),
      recentBackups: backups.slice(0, 5),
      checklists,
      checklistActions
    }
  } catch (err) {
    console.error('Dashboard Server Action Exception:', err)
    return { error: `Server Error: ${err.message || String(err)}` }
  }
}
