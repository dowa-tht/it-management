'use server'
import { createClient } from '@supabase/supabase-js'
import { calculateNetBusinessMinutes, SLA_LIMITS, calculateSLARates } from '@/lib/slaUtils'
import { getCurrentUserSession } from './user'

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

    // Get current user for Pending Approvals
    const session = await getCurrentUserSession()
    let pendingCount = 0
    let userProfile = null

    if (session && session.user) {
      const { data: profile } = await supabaseAdmin
        .from('user_profiles')
        .select('id, role, email')
        .eq(session.type === 'internal' ? 'email' : 'id', (session.user.email || session.user.id))
        .maybeSingle()
      userProfile = profile
    }

    // timezoneOffset is used to calculate "today" correctly for the user's local time if needed
    // Defaults to -420 for UTC+7 (Bangkok)
    const start = new Date()
    start.setMonth(start.getMonth() - 1)
    const startIso = start.toISOString()

    // Safety: ensure timezoneOffset is a valid number
    const safeOffset = typeof timezoneOffset === 'number' ? timezoneOffset : -420
    const todayDate = new Date(new Date().getTime() - (safeOffset * 60000))
    const todayStr = isNaN(todayDate.getTime()) ? new Date().toISOString().split('T')[0] : todayDate.toISOString().split('T')[0]

    // Fetch data for the last 35 days for Checklist Streak and Monthly calculation
    const streakStart = new Date()
    streakStart.setDate(streakStart.getDate() - 35)
    const streakStartStr = isNaN(streakStart.getTime()) ? todayStr : streakStart.toISOString().split('T')[0]

    const ytdStartIso = `${todayStr.substring(0, 4)}-01-01T00:00:00`

    const results = await Promise.all([
      supabaseAdmin.from('incidents').select('id, case_number, title, severity, status, created_at, acknowledged_at, assigned_at, resolved_at, affected_system').gte('created_at', startIso).order('created_at', { ascending: false }),
      supabaseAdmin.from('backup_logs').select('id, log_date, system_name, status, notes').gte('log_date', startIso.split('T')[0]).order('log_date', { ascending: false }),
      supabaseAdmin.from('checklist_docs').select('id, status, freq_type, period_date, checklist_items(id, status)').gte('period_date', streakStartStr),
      supabaseAdmin.from('holidays').select('holiday_date').gte('holiday_date', streakStartStr),
      supabaseAdmin.from('system_settings').select('value').eq('key', 'working_hours').maybeSingle(),
      supabaseAdmin.from('incident_exclusions').select('*').gte('start_time', startIso),
      supabaseAdmin.from('system_settings').select('value').eq('key', 'sla_limits').maybeSingle(),
      supabaseAdmin.from('checklist_docs').select('id, status, freq_type, period_date, checklist_items(id, status)').eq('freq_type', 'Yearly').gte('period_date', `${todayStr.substring(0, 4)}-01-01`),
      // Fetch Pending Approvals (Unified Workflow - For Approver)
      userProfile ? supabaseAdmin.from('document_approvals')
        .select('id')
        .eq('status', 'pending')
        .or(`approver_id.eq.${userProfile.id},role_required.eq.${userProfile.role}`) : Promise.resolve({ data: [] }),
      // Fetch My Sent Pending Items (For Sender Tracking)
      userProfile?.email ? supabaseAdmin.from('checklist_docs').select('id').in('workflow_status', ['pending', 'PENDING', 'Pending Approval']).eq('created_by', userProfile.email) : Promise.resolve({ data: [] }),
      userProfile ? supabaseAdmin.from('incidents').select('id').ilike('status', 'Pending Approval')
          .or(`reported_by_id.eq.${userProfile.id},reported_by.eq.${userProfile.email || '___'}`) : Promise.resolve({ data: [] }),
      supabaseAdmin.from('incidents').select('id, severity, status, created_at, acknowledged_at, assigned_at, resolved_at').gte('created_at', ytdStartIso)
    ])

    const [incRes, bakRes, chkRes, holidayRes, settingsRes, exclusionsRes, slaLimitsRes, yearlyRes, pendingApprovalsRes, myPendingChkRes, myPendingIncRes, ytdIncRes] = results;

    if (chkRes.error) console.error('Checklists Fetch Error:', chkRes.error)

    let incidents = incRes.data || []
    
    // 🛡️ แยกข้อมูล: เก็บงานของตนเองไว้แสดงผลแยกต่างหาก (สำหรับ Member)
    let myIncidents = []
    if (userProfile) {
      myIncidents = incidents.filter(i => i.reported_by_id === userProfile.id || i.reported_by === userProfile.email)
    }
    const backups = bakRes.data || []
    const allChecklists = chkRes.error ? [] : (chkRes.data || [])
    const holidays = holidayRes.error ? [] : (holidayRes.data?.map(h => h.holiday_date) || [])

    // Extract settings needed for calculations
    const wh = settingsRes.data?.value || { start: '08:30', end: '17:30', work_days: [1, 2, 3, 4, 5] }

    // Filter checklists for "Today" to keep backward compatibility
    const checklists = allChecklists.filter(c => c.period_date === todayStr)

    // Calculate Health Streak (Last 7 Working Days)
    const streak = []
    let cursorDate = new Date(todayDate)
    
    // We go backwards to find 7 valid working days
    while (streak.length < 7 && cursorDate >= streakStart) {
      const dStr = cursorDate.toISOString().split('T')[0]
      const dayOfWeek = cursorDate.getUTCDay() // Use UTC because we adjusted the timestamp manually to the user's local time
      
      const isWorkingDay = wh.work_days.includes(dayOfWeek)
      const isHoliday = holidays.includes(dStr)

      if (!isWorkingDay || isHoliday) {
        streak.unshift({ date: dStr, status: 'skip', label: isHoliday ? 'Holiday' : 'Weekend', ngCount: 0 })
      } else {
        // It's a working day
        const dailyDoc = allChecklists.find(c => c.period_date === dStr && c.freq_type === 'Daily')
        if (!dailyDoc) {
          const isToday = dStr === todayStr
          streak.unshift({ 
            date: dStr, 
            status: isToday ? 'pending' : 'missed', 
            label: isToday ? 'รอตรวจสอบ' : 'Missed', 
            ngCount: 0 
          })
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
      cursorDate.setUTCDate(cursorDate.getUTCDate() - 1)
    }

    // Keep only the last 7 to be exact
    const finalStreak = streak.slice(-7)

    // Calculate other Action Cards data (Weekly / Monthly)
    const getCardStatus = (doc) => {
      if (!doc) return { status: 'pending', label: 'ยังไม่ได้ดำเนินการ', ngCount: 0 }
      
      const items = doc.checklist_items || []
      const ngCount = items.filter(i => i.status === 'NG') ? items.filter(i => i.status === 'NG').length : 0
      const hasProgress = items.some(i => i.status !== null)

      if (doc.status === 'Closed') {
        return { status: ngCount > 0 ? 'ng' : 'done', label: ngCount > 0 ? `พบ ${ngCount} ปัญหา (NG)` : 'ตรวจเสร็จสมบูรณ์', ngCount }
      }
      
      if (hasProgress) return { status: 'in-progress', label: 'กำลังดำเนินการ', ngCount }
      return { status: 'pending', label: 'รอการตรวจสอบ', ngCount: 0 }
    }

    const weeklyDoc = allChecklists.find(c => c.freq_type === 'Weekly' && new Date(c.period_date) >= new Date(todayDate.getTime() - 7*24*60*60*1000))
    const monthlyDoc = allChecklists.find(c => c.freq_type === 'Monthly' && c.period_date.startsWith(todayStr.substring(0, 7)))
    const yearlyDoc = yearlyRes?.data ? yearlyRes.data.find(c => c.period_date.startsWith(todayStr.substring(0, 4))) : null

    const checklistActions = {
      dailyStatus: finalStreak[finalStreak.length - 1], // Today
      weeklyStatus: getCardStatus(weeklyDoc),
      monthlyStatus: getCardStatus(monthlyDoc),
      yearlyStatus: getCardStatus(yearlyDoc),
      streak: finalStreak
    }

    // Aggregate Data to reduce payload size
    const totalIncidents = incidents.length
    const highSeverity = incidents.filter(i => i.severity === 'High').length
    const inProgress = incidents.filter(i => i.status === 'In Progress').length
    const pending = incidents.filter(i => i.status === 'Pending Approval').length
    const openIncidents = incidents.filter(i => i.status === 'Open').length
    
    const backupSuccessRate = backups.length
      ? Math.round((backups.filter(b => b.status === 'Success').length / backups.length) * 100)
      : 0

    const allExclusions = exclusionsRes.data || []
    const dynamicSlaLimits = slaLimitsRes.data?.value || SLA_LIMITS
    const responseLimits = dynamicSlaLimits.Response || { High: 15, Medium: 60, Low: 240 }

    const reportData = incidents.map(inc => {
      const respTime = inc.acknowledged_at || inc.assigned_at
      const incExclusions = allExclusions.filter(e => e.incident_id === inc.id)
      
      const resLimit = dynamicSlaLimits[inc.severity] || dynamicSlaLimits.Medium
      const respLimit = responseLimits[inc.severity] || responseLimits.Medium
      
      let respMin = null
      if (respTime) respMin = calculateNetBusinessMinutes(inc.created_at, respTime, wh, holidays, [])
      
      let resMin = null
      if (inc.status === 'Closed' && inc.resolved_at) {
        resMin = calculateNetBusinessMinutes(inc.created_at, inc.resolved_at, wh, holidays, incExclusions)
      }

      return {
        ...inc,
        isResponseOK: respMin !== null ? respMin <= respLimit : (inc.status === 'Open' ? null : false),
        isResolveOK: resMin !== null ? resMin <= resLimit : (inc.status === 'Closed' ? false : null)
      }
    })

    const { complianceRate: slaComplianceRate } = calculateSLARates(reportData)

    // YTD Calculation
    const ytdIncidents = ytdIncRes.data || []
    const ytdReportData = ytdIncidents.map(inc => {
      const respTime = inc.acknowledged_at || inc.assigned_at
      const incExclusions = allExclusions.filter(e => e.incident_id === inc.id)
      const resLimit = dynamicSlaLimits[inc.severity] || dynamicSlaLimits.Medium
      const respLimit = responseLimits[inc.severity] || responseLimits.Medium
      let respMin = null
      if (respTime) respMin = calculateNetBusinessMinutes(inc.created_at, respTime, wh, holidays, [])
      let resMin = null
      if (inc.status === 'Closed' && inc.resolved_at) resMin = calculateNetBusinessMinutes(inc.created_at, inc.resolved_at, wh, holidays, incExclusions)
      return {
        ...inc,
        isResponseOK: respMin !== null ? respMin <= respLimit : (inc.status === 'Open' ? null : false),
        isResolveOK: resMin !== null ? resMin <= resLimit : (inc.status === 'Closed' ? false : null)
      }
    })
    const { complianceRate: slaComplianceRateYTD } = calculateSLARates(ytdReportData)

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
        pending,
        openIncidents,
        backupSuccessRate,
        slaComplianceRate,
        slaComplianceRateYTD
      },
      incidentByDay,
      severityData,
      recentIncidents: incidents.slice(0, 5),
      myRecentIncidents: myIncidents.slice(0, 5), // 👈 เพิ่มส่วนนี้
      recentBackups: backups.slice(0, 5),
      checklists,
      checklistActions,
      userProfile, // 👈 เพิ่ม profile เพื่อใช้เช็ค role ในหน้าบ้าน
      pendingApprovalsCount: pendingApprovalsRes?.data?.length || 0,
      myPendingFollowupsCount: (myPendingChkRes?.data?.length || 0) + (myPendingIncRes?.data?.length || 0)
    }
  } catch (err) {
    console.error('Dashboard Server Action Exception:', err)
    return { error: `Server Error: ${err.message || String(err)}` }
  }
}
