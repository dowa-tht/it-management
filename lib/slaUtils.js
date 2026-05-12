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

  while (current <= endDate) {
    const dayStr = current.toISOString().split('T')[0];
    const dayOfWeek = current.getUTCDay(); 
    
    if (settings.work_days.includes(dayOfWeek) && !holidays.includes(dayStr)) {
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

/**
 * Standardized SLA Rate Calculation for Dashboard and Reports
 */
export function calculateSLARates(reportData) {
  // Use calculated flags to ensure numerator and denominator are perfectly aligned
  const responseEvaluated = reportData.filter(i => i.isResponseOK !== null);
  const resolutionEvaluated = reportData.filter(i => i.isResolveOK !== null);
  
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
    resolutionPassedCount
  };
}
