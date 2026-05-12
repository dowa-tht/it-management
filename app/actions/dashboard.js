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
        .select('id, role, email, full_name')
        .or(`id.eq.${session.user.id},email.eq.${session.user.email || '___'}`)
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
      supabaseAdmin.from('incidents').select('id, case_number, title, severity, status, created_at, acknowledged_at, assigned_at, resolved_at, affected_system, reported_by').gte('created_at', startIso).order('created_at', { ascending: false }),
      supabaseAdmin.from('backup_logs').select('id, log_date, system_name, status, notes').gte('log_date', startIso.split('T')[0]).order('log_date', { ascending: false }),
      supabaseAdmin.from('checklist_docs').select('id, status, freq_type, period_date, checklist_items(id, item_key, status)').gte('period_date', streakStartStr),
      supabaseAdmin.from('holidays').select('holiday_date').gte('holiday_date', streakStartStr),
      supabaseAdmin.from('system_settings').select('value').eq('key', 'working_hours').maybeSingle(),
      supabaseAdmin.from('incident_exclusions').select('*').gte('start_time', startIso),
      supabaseAdmin.from('system_settings').select('value').eq('key', 'sla_limits').maybeSingle(),
      supabaseAdmin.from('checklist_docs').select('id, status, freq_type, period_date, checklist_items(id, item_key, status)').eq('freq_type', 'Yearly').gte('period_date', `${todayStr.substring(0, 4)}-01-01`),
      supabaseAdmin.from('checklist_templates').select('freq_type, item_key').eq('is_active', true),
      // Fetch Pending Approvals (Unified Workflow - For Approver) — split into 2 queries for reliability
      userProfile ? Promise.all([
        supabaseAdmin.from('document_approvals').select('id').eq('status', 'pending').eq('approver_id', userProfile.id),
        supabaseAdmin.from('document_approvals').select('id').eq('status', 'pending').is('approver_id', null).eq('role_required', userProfile.role)
      ]).then(([byId, byRole]) => ({ data: [...(byId.data || []), ...(byRole.data || [])] })) : Promise.resolve({ data: [] }),
      // Fetch My Sent Pending Items (For Sender Tracking) — UUID-based lookup
      userProfile ? supabaseAdmin.from('checklist_docs').select('id').in('workflow_status', ['pending', 'PENDING', 'Pending Approval']).eq('created_by_id', userProfile.id) : Promise.resolve({ data: [] }),
      userProfile ? supabaseAdmin.from('incidents').select('id').ilike('status', 'Pending Approval')
          .eq('reported_by_id', userProfile.id) : Promise.resolve({ data: [] }),
      supabaseAdmin.from('incidents').select('id, severity, status, created_at, acknowledged_at, assigned_at, resolved_at, affected_system, reported_by').gte('created_at', ytdStartIso)
    ])

    const [
      incRes, bakRes, chkRes, holidayRes, settingsRes, exclusionsRes, slaLimitsRes, 
      yearlyRes, templatesRes, pendingApprovalsRes, myPendingChkRes, myPendingIncRes, ytdIncRes
    ] = results;

    if (chkRes.error) console.error('Checklists Fetch Error:', chkRes.error)

    let incidents = incRes.data || []
    
    // 🛡️ แยกข้อมูล: เก็บงานของตนเองไว้แสดงผลแยกต่างหาก (สำหรับ Member หรือผู้ที่ต้องการดูงานตนเอง)
    let myIncidents = []
    if (userProfile) {
      myIncidents = incidents.filter(i => 
        i.reported_by === userProfile.full_name || 
        i.reported_by === userProfile.email
      )
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
    
    // Get all active templates and count them per frequency
    const templates = templatesRes.data || []
    const templateCountMap = { Daily: 0, Weekly: 0, Monthly: 0, Yearly: 0 }
    templates.forEach(t => { if (templateCountMap[t.freq_type] !== undefined) templateCountMap[t.freq_type]++ })

    // We go backwards to find 7 valid working days
    while (streak.length < 7 && cursorDate >= streakStart) {
      const dStr = cursorDate.toISOString().split('T')[0]
      const dayOfWeek = cursorDate.getUTCDay() 
      
      const isWorkingDay = wh.work_days.includes(dayOfWeek)
      const isHoliday = holidays.includes(dStr)

      if (!isWorkingDay || isHoliday) {
        streak.unshift({ date: dStr, status: 'skip', label: isHoliday ? 'Holiday' : 'Weekend', ngCount: 0 })
      } else {
        // It's a working day - Aggregate all Daily documents for this day
        const dailyDocs = allChecklists.filter(c => c.period_date === dStr && c.freq_type === 'Daily')
        
        if (dailyDocs.length === 0) {
          const isToday = dStr === todayStr
          streak.unshift({ 
            date: dStr, 
            status: isToday ? 'pending' : 'missed', 
            label: isToday ? 'รอตรวจสอบ' : 'Missed', 
            ngCount: 0 
          })
        } else {
          // Combine all items from all documents for this day
          const allItems = dailyDocs.flatMap(d => d.checklist_items || [])
          const ngCount = allItems.filter(i => i.status === 'NG').length
          const hasNG = ngCount > 0
          
          // Count unique items that are in CLOSED documents
          const closedItemKeys = new Set(
            dailyDocs
              .filter(d => d.status === 'Closed')
              .flatMap(d => (d.checklist_items || []).map(i => i.item_key))
          )
          
          const totalItemsInDocs = new Set(allItems.map(i => i.item_key)).size
          const expectedCount = templateCountMap.Daily || 6 // Fallback to 6 as per lib/checklistItems.js
          
          if (closedItemKeys.size >= expectedCount) {
            streak.unshift({ date: dStr, status: hasNG ? 'ng' : 'ok', label: hasNG ? `พบ ${ngCount} ปัญหา (NG)` : 'ตรวจครบถ้วน', ngCount })
          } else {
            // Not all items are closed
            const hasProgress = allItems.some(i => i.status !== null)
            if (hasProgress || dailyDocs.length > 0) {
              streak.unshift({ date: dStr, status: 'in-progress', label: 'อยู่ในระหว่างดำเนินการ', ngCount })
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

    // Calculate other Action Cards data (Weekly / Monthly / Yearly) with Aggregation
    const getCardStatus = (freqType, targetDocs) => {
      if (!targetDocs || targetDocs.length === 0) return { status: 'pending', label: 'ยังไม่ได้ดำเนินการ', ngCount: 0 }
      
      const allItems = targetDocs.flatMap(d => d.checklist_items || [])
      const ngCount = allItems.filter(i => i.status === 'NG').length
      
      // Count unique items that are in CLOSED documents
      const closedItemKeys = new Set(
        targetDocs
          .filter(d => d.status === 'Closed')
          .flatMap(d => (d.checklist_items || []).map(i => i.item_key))
      )
      
      const expectedCount = templateCountMap[freqType] || (freqType === 'Weekly' ? 2 : freqType === 'Monthly' ? 3 : freqType === 'Yearly' ? 3 : 0)
      
      if (closedItemKeys.size >= expectedCount) {
        return { status: ngCount > 0 ? 'ng' : 'done', label: ngCount > 0 ? `พบ ${ngCount} ปัญหา (NG)` : 'ตรวจเสร็จสมบูรณ์', ngCount }
      }
      
      const hasProgress = allItems.some(i => i.status !== null)
      if (hasProgress || targetDocs.length > 0) return { status: 'in-progress', label: 'อยู่ในระหว่างดำเนินการ', ngCount }
      
      return { status: 'pending', label: 'รอการตรวจสอบ', ngCount: 0 }
    }

    const weeklyDocs = allChecklists.filter(c => c.freq_type === 'Weekly' && new Date(c.period_date) >= new Date(todayDate.getTime() - 7*24*60*60*1000))
    const monthlyDocs = allChecklists.filter(c => c.freq_type === 'Monthly' && c.period_date.startsWith(todayStr.substring(0, 7)))
    const yearlyDocs = yearlyRes?.data ? yearlyRes.data : []

    const checklistActions = {
      dailyStatus: finalStreak[finalStreak.length - 1], // Today
      weeklyStatus: getCardStatus('Weekly', weeklyDocs),
      monthlyStatus: getCardStatus('Monthly', monthlyDocs),
      yearlyStatus: getCardStatus('Yearly', yearlyDocs),
      streak: finalStreak
    }

    // Aggregate Data to reduce payload size
    const totalIncidents = incidents.length
  const highSeverity = incidents.filter(i => i.severity === 'High').length
  // Count unique incidents in progress; ensure no duplicate counting from joins
  const inProgress = incidents.reduce((set, inc) => {
    if (inc.status === 'In Progress') set.add(inc.id)
    return set
  }, new Set()).size
  const pending = incidents.filter(i => i.status === 'Pending Approval').length
  const openIncidents = incidents.filter(i => i.status === 'Open').length
    
    const backupSuccessRate = backups.length
      ? Math.round((backups.filter(b => b.status === 'Success').length / backups.length) * 100)
      : 0

    const allExclusions = exclusionsRes.data || []
    const dynamicSlaLimits = slaLimitsRes.data?.value || SLA_LIMITS
    
    // Extract limits with deep fallback to the new standard
    const responseLimits = dynamicSlaLimits.Response || { 
      High: dynamicSlaLimits.High_Response || 60, 
      Medium: dynamicSlaLimits.Medium_Response || 120, 
      Low: dynamicSlaLimits.Low_Response || 360 
    }
    const resolutionLimits = dynamicSlaLimits.Resolution || {
      High: dynamicSlaLimits.High || 240,
      Medium: dynamicSlaLimits.Medium || 480,
      Low: dynamicSlaLimits.Low || 1620
    }

    const reportData = incidents.map(inc => {
      const incExclusions = allExclusions.filter(e => e.incident_id === inc.id)
      const resLimit = resolutionLimits[inc.severity] || resolutionLimits.Medium
      const respLimit = responseLimits[inc.severity] || responseLimits.Medium
      
      let respMin = null
      const respTime = inc.acknowledged_at || inc.assigned_at
      if (respTime) respMin = calculateNetBusinessMinutes(inc.created_at, respTime, wh, holidays, [])
      
      let resMin = null
      if (inc.resolved_at) {
        resMin = calculateNetBusinessMinutes(inc.created_at, inc.resolved_at, wh, holidays, incExclusions)
      }

      // --- Strict Mode Logic ---
      let isResponseOK = null
      if (respMin !== null) {
        isResponseOK = respMin <= respLimit
      } else {
        const currentMin = calculateNetBusinessMinutes(inc.created_at, null, wh, holidays, [])
        isResponseOK = currentMin > respLimit ? false : null
      }

      let isResolveOK = null
      if (resMin !== null) {
        isResolveOK = resMin <= resLimit
      } else {
        const currentResMin = calculateNetBusinessMinutes(inc.created_at, null, wh, holidays, incExclusions)
        isResolveOK = (inc.status !== 'Closed') ? (currentResMin > resLimit ? false : null) : false
      }

      return {
        ...inc,
        isResponseOK,
        isResolveOK
      }
    })

    const { complianceRate: slaComplianceRate } = calculateSLARates(reportData)

    // YTD Calculation
    const ytdIncidents = ytdIncRes.data || []
    const ytdReportData = ytdIncidents.map(inc => {
      const incExclusions = allExclusions.filter(e => e.incident_id === inc.id)
      const resLimit = resolutionLimits[inc.severity] || resolutionLimits.Medium
      const respLimit = responseLimits[inc.severity] || responseLimits.Medium
      
      let respMin = null
      const respTime = inc.acknowledged_at || inc.assigned_at
      if (respTime) respMin = calculateNetBusinessMinutes(inc.created_at, respTime, wh, holidays, [])
      
      let resMin = null
      if (inc.resolved_at) resMin = calculateNetBusinessMinutes(inc.created_at, inc.resolved_at, wh, holidays, incExclusions)
      
      // --- Strict Mode Logic ---
      let isResponseOK = null
      if (respMin !== null) {
        isResponseOK = respMin <= respLimit
      } else {
        const currentMin = calculateNetBusinessMinutes(inc.created_at, null, wh, holidays, [])
        isResponseOK = currentMin > respLimit ? false : null
      }

      let isResolveOK = null
      if (resMin !== null) {
        isResolveOK = resMin <= resLimit
      } else {
        const currentResMin = calculateNetBusinessMinutes(inc.created_at, null, wh, holidays, incExclusions)
        isResolveOK = (inc.status !== 'Closed') ? (currentResMin > resLimit ? false : null) : false
      }

      return {
        ...inc,
        isResponseOK,
        isResolveOK
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

    const ngChecklistsCount = allChecklists.filter(c => 
      c.checklist_items?.some(i => i.status === 'NG')
    ).length

    return {
      stats: {
        totalIncidents,
        highSeverity,
        ngChecklistsCount,
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
      myRecentIncidents: myIncidents.slice(0, 5),
      recentBackups: backups.slice(0, 5),
      checklists,
      checklistActions,
      userProfile,
      pendingApprovalsCount: pendingApprovalsRes?.data?.length || 0,
      myPendingFollowupsCount: (myPendingChkRes?.data?.length || 0) + (myPendingIncRes?.data?.length || 0),
      wh: wh,
      holidays: holidays,
      
      // --- Employee Specific Data (For Redesigned Dashboard) ---
      employeeStats: (userProfile?.role === 'employee') ? {
        total: ytdIncidents.filter(i => i.reported_by === userProfile.email || i.reported_by === userProfile.full_name).length,
        inProgress: incidents.filter(i => (i.reported_by === userProfile.email || i.reported_by === userProfile.full_name) && (i.status === 'Open' || i.status === 'In Progress')).length,
        pendingConfirm: incidents.filter(i => (i.reported_by === userProfile.email || i.reported_by === userProfile.full_name) && i.status === 'Pending Approval').length,
        closed: ytdIncidents.filter(i => (i.reported_by === userProfile.email || i.reported_by === userProfile.full_name) && i.status === 'Closed').length,
        
        // Trend Data (Last 6 Months from YTD)
        trend: (() => {
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const myYtd = ytdIncidents.filter(i => i.reported_by === userProfile.email || i.reported_by === userProfile.full_name);
          const map = {};
          
          // Initialize last 6 months
          for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(new Date().getMonth() - i); 
            const m = months[d.getMonth()];
            map[m] = 0;
          }
          
          myYtd.forEach(i => {
            const m = months[new Date(i.created_at).getMonth()];
            if (map[m] !== undefined) map[m]++;
          });
          
          return Object.entries(map).map(([name, value]) => ({ name, value }));
        })(),
        
        // Category Breakdown (Top Systems)
        categories: (() => {
          const myYtd = ytdIncidents.filter(i => i.reported_by === userProfile.email || i.reported_by === userProfile.full_name);
          const map = {};
          myYtd.forEach(i => {
            const s = i.affected_system || 'อื่นๆ (Other)';
            map[s] = (map[s] || 0) + 1;
          });
          const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
          return Object.entries(map)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, value], idx) => ({ name, value, color: colors[idx % colors.length] }));
        })()
      } : null
    }
  } catch (err) {
    console.error('Dashboard Server Action Exception:', err)
    return { error: `Server Error: ${err.message || String(err)}` }
  }
}
