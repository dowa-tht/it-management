/**
 * SLA Utils: Core logic for calculating business minutes and SLA compliance.
 * Forced to Bangkok Time (UTC+7) for consistency across environments.
 */

const TZ_OFFSET = -420; // Bangkok is UTC+7

/**
 * Helper to adjust any date to Bangkok "view" in UTC
 */
const toBangkok = (date) => {
  if (!date) return new Date();
  return new Date(new Date(date).getTime() - (TZ_OFFSET * 60000));
};

/**
 * Calculates the number of business minutes between two dates, 
 * considering working hours, weekends, holidays, and SLA exclusions.
 */
export function calculateNetBusinessMinutes(start, end, settings, holidays = [], exclusions = []) {
  if (!start) return 0;
  
  const startDate = toBangkok(start);
  const endDate = end ? toBangkok(end) : toBangkok(new Date());
  
  if (startDate > endDate) return 0;

  let totalMinutes = 0;
  let current = new Date(startDate);
  current.setUTCSeconds(0, 0); 
  
  const [sH, sM] = settings.start.split(':').map(Number);
  const [eH, eM] = settings.end.split(':').map(Number);

  let safetyCounter = 0;
  while (current <= endDate && safetyCounter < 1000) {
    safetyCounter++;
    const dayStr = current.toISOString().split('T')[0];
    const dayOfWeek = current.getUTCDay(); 
    
    if (settings && settings.work_days && settings.work_days.includes(dayOfWeek) && !holidays.includes(dayStr)) {
      const dayStart = new Date(current);
      dayStart.setUTCHours(sH, sM, 0, 0);
      
      const dayEnd = new Date(current);
      dayEnd.setUTCHours(eH, eM, 0, 0);
      
      const effectiveStart = new Date(Math.max(current.getTime(), dayStart.getTime(), startDate.getTime()));
      const effectiveEnd = new Date(Math.min(endDate.getTime(), dayEnd.getTime()));
      
      if (effectiveStart < effectiveEnd) {
        totalMinutes += (effectiveEnd - effectiveStart) / 60000;
      }
    }
    
    // Advance to next day properly
    current.setUTCDate(current.getUTCDate() + 1);
    current.setUTCHours(0, 0, 0, 0);
  }

  // 2. Subtract Exclusion Minutes
  let exclusionMinutes = 0;
  for (const ex of exclusions) {
    if (!ex.start_time) continue;
    
    // We pass original times to the recursive call because it will handle toBangkok conversion
    const exStartRaw = ex.start_time;
    const exEndRaw = ex.end_time || new Date();
    
    // Determine overlap in original time to avoid double-shifting
    const overlapStart = new Date(Math.max(new Date(exStartRaw).getTime(), new Date(start).getTime()));
    const overlapEnd = new Date(Math.min(new Date(exEndRaw).getTime(), new Date(end || new Date()).getTime()));
    
    if (overlapStart < overlapEnd) {
      exclusionMinutes += calculateNetBusinessMinutes(overlapStart, overlapEnd, settings, holidays, []);
    }
  }

  return Math.max(0, Math.round(totalMinutes - exclusionMinutes));
}

export const SLA_LIMITS = {
  Response: {
    High: 60,
    Medium: 120,
    Low: 360,
  },
  Resolution: {
    High: 240,
    Medium: 480,
    Low: 1620,
  }
};

/**
 * Formats minutes into Thai readable duration (e.g., "1 ชั่วโมง 15 นาที")
 */
export function formatDurationThai(minutes) {
  if (minutes === null || minutes === undefined || isNaN(minutes)) return '-';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  
  if (h === 0) return `${m} นาที`;
  return `${h} ชั่วโมง ${m} นาที`;
}

export function isSLACompliant(netMinutes, severity, type = 'Resolution') {
  const limits = SLA_LIMITS[type] || SLA_LIMITS.Resolution;
  const limit = limits[severity] || limits.Medium;
  return netMinutes <= limit;
}

export function normalizeSlaLimits(value) {
  const base = value || {}
  const response = base.Response || {}
  const resolution = base.Resolution || {}

  const toInt = (v, fallback) => {
    const n = Number(v)
    if (!Number.isFinite(n) || n < 0) return fallback
    return Math.floor(n)
  }

  return {
    Response: {
      High: toInt(response.High ?? base.High_Response, SLA_LIMITS.Response.High),
      Medium: toInt(response.Medium ?? base.Medium_Response, SLA_LIMITS.Response.Medium),
      Low: toInt(response.Low ?? base.Low_Response, SLA_LIMITS.Response.Low),
    },
    Resolution: {
      High: toInt(resolution.High ?? base.High, SLA_LIMITS.Resolution.High),
      Medium: toInt(resolution.Medium ?? base.Medium, SLA_LIMITS.Resolution.Medium),
      Low: toInt(resolution.Low ?? base.Low, SLA_LIMITS.Resolution.Low),
    },
  }
}

export function getIncidentSlaLimits(settingsValue, severity) {
  const normalized = normalizeSlaLimits(settingsValue)
  const key = severity && normalized.Response[severity] !== undefined ? severity : 'Medium'
  return {
    responseLimit: normalized.Response[key],
    resolveLimit: normalized.Resolution[key],
    normalized,
  }
}

export function calculateSlaScoreFromSnapshot(snapshot) {
  if (!snapshot?.isEvaluated) return null

  const responsePass = snapshot.isResponseOK === true
  const resolvePass = snapshot.isResolveOK === true

  if (responsePass && resolvePass) return 1
  if (responsePass || resolvePass) return 0.5
  return 0
}

export function calculateIncidentSlaSnapshot(incident, options = {}) {
  const now = options.now || new Date()
  const workingHours = options.workingHours || { start: '08:30', end: '17:30', work_days: [1, 2, 3, 4, 5] }
  const holidays = options.holidays || []
  const exclusions = options.exclusions || []

  const { responseLimit, resolveLimit } = getIncidentSlaLimits(options.slaLimits, incident?.severity)

  const responseStart = incident?.created_at || null
  const responseEnd = incident?.acknowledged_at || null
  const responseMin = responseStart && responseEnd
    ? calculateNetBusinessMinutes(responseStart, responseEnd, workingHours, holidays, [])
    : null

  const resolutionStart = incident?.acknowledged_at || incident?.assigned_at || null
  const resolutionEnd = incident?.resolved_at || null
  const resolutionTail = resolutionEnd || now
  const resolveMin = resolutionStart && resolutionEnd
    ? calculateNetBusinessMinutes(resolutionStart, resolutionEnd, workingHours, holidays, exclusions)
    : null

  const pauseMinutes = resolutionStart
    ? exclusions.reduce((sum, ex) => {
        if (!ex?.start_time) return sum
        const exStart = new Date(ex.start_time)
        const exEnd = new Date(ex.end_time || now)
        const windowStart = new Date(resolutionStart)
        const windowEnd = new Date(resolutionTail)
        if (
          Number.isNaN(exStart.getTime()) ||
          Number.isNaN(exEnd.getTime()) ||
          Number.isNaN(windowStart.getTime()) ||
          Number.isNaN(windowEnd.getTime())
        ) {
          return sum
        }
        const overlapStart = new Date(Math.max(exStart.getTime(), windowStart.getTime()))
        const overlapEnd = new Date(Math.min(exEnd.getTime(), windowEnd.getTime()))
        if (overlapStart >= overlapEnd) return sum
        return sum + calculateNetBusinessMinutes(overlapStart, overlapEnd, workingHours, holidays, [])
      }, 0)
    : 0

  const activePause = exclusions.some((ex) => ex?.start_time && !ex?.end_time)

  const isResponseOK = responseMin === null ? null : responseMin <= responseLimit
  const isResolveOK = resolveMin === null ? null : resolveMin <= resolveLimit

  const responseStatus = isResponseOK === null ? 'N/A' : (isResponseOK ? 'PASS' : 'FAIL')
  const resolutionStatus = isResolveOK === null ? 'N/A' : (isResolveOK ? 'PASS' : 'FAIL')

  const isClosed = incident?.status === 'Closed'
  const isCancelled = incident?.status === 'Cancelled'
  const isEvaluated = isClosed && !isCancelled && isResponseOK !== null && isResolveOK !== null

  const snapshot = {
    responseMin,
    resolveMin,
    responseLimit,
    resolveLimit,
    isResponseOK,
    isResolveOK,
    isSlaPassed: false,
    incidentScore: null,
    isEvaluated,
    responseStatus,
    resolutionStatus,
    pauseMinutes,
    activePause,
  }

  snapshot.incidentScore = calculateSlaScoreFromSnapshot(snapshot)
  snapshot.isSlaPassed = snapshot.incidentScore === 1

  return snapshot
}

/**
 * Standardized SLA Rate Calculation for Dashboard and Reports
 */
export function calculateSLARates(reportData) {
  const list = Array.isArray(reportData) ? reportData : []

  const scored = list.filter((i) => typeof i.incidentScore === 'number')
  if (scored.length > 0) {
    const responseEvaluated = scored.filter(i => i.isResponseOK !== null)
    const resolutionEvaluated = scored.filter(i => i.isResolveOK !== null)
    const responsePassedCount = responseEvaluated.filter(i => i.isResponseOK === true).length
    const resolutionPassedCount = resolutionEvaluated.filter(i => i.isResolveOK === true).length
    const acknowledgedCount = responseEvaluated.length
    const resolvedCount = resolutionEvaluated.length
    const responseRate = acknowledgedCount > 0 ? Math.round((responsePassedCount / acknowledgedCount) * 100) : 100
    const resolutionRate = resolvedCount > 0 ? Math.round((resolutionPassedCount / resolvedCount) * 100) : 100
    const complianceRate = Math.round((scored.reduce((sum, i) => sum + i.incidentScore, 0) / scored.length) * 100)

    return {
      responseRate,
      resolutionRate,
      complianceRate,
      acknowledgedCount,
      resolvedCount,
      responsePassedCount,
      resolutionPassedCount,
      evaluatedCount: scored.length,
    }
  }

  // Legacy fallback during transition
  const responseEvaluated = list.filter(i => i.isResponseOK !== null);
  const resolutionEvaluated = list.filter(i => i.isResolveOK !== null);
  
  const acknowledgedCount = responseEvaluated.length;
  const resolvedCount = resolutionEvaluated.length;
  
  const responsePassedCount = responseEvaluated.filter(i => i.isResponseOK === true).length;
  const resolutionPassedCount = resolutionEvaluated.filter(i => i.isResolveOK === true).length;

  const responseRate = acknowledgedCount > 0 ? Math.round((responsePassedCount / acknowledgedCount) * 100) : 100;
  const resolutionRate = resolvedCount > 0 ? Math.round((resolutionPassedCount / resolvedCount) * 100) : 100;
  
  const complianceRate = Math.round((responseRate + resolutionRate) / 2);
  
  return { 
    responseRate, 
    resolutionRate, 
    complianceRate, 
    acknowledgedCount, 
    resolvedCount,
    responsePassedCount,
    resolutionPassedCount,
    evaluatedCount: list.length,
  };
}
