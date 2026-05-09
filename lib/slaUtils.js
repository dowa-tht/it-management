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
  High: 4 * 60,      // 4 Hours
  Medium: 8 * 60,    // 8 Hours
  Low: 3 * 9 * 60,    // 3 Days (Business Hours: 9h/day = 1,620 min)
};

export function isSLACompliant(netMinutes, severity) {
  const limit = SLA_LIMITS[severity] || SLA_LIMITS.Medium;
  return netMinutes <= limit;
}

/**
 * Standardized SLA Rate Calculation for Dashboard and Reports
 */
export function calculateSLARates(reportData) {
  const acknowledgedCount = reportData.filter(i => i.acknowledged_at || i.assigned_at).length;
  const resolvedCount = reportData.filter(i => i.status === 'Closed').length;
  
  const responsePassedCount = reportData.filter(i => i.isResponseOK === true).length;
  const resolutionPassedCount = reportData.filter(i => i.isResolveOK === true).length;

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
