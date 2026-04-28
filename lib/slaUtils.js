/**
 * SLA Utils: Core logic for calculating business minutes and SLA compliance.
 */

/**
 * Calculates the number of business minutes between two dates, 
 * considering working hours, weekends, holidays, and SLA exclusions.
 * 
 * @param {Date|string} start - Start time
 * @param {Date|string} end - End time (or current time if not resolved)
 * @param {Object} settings - Working hours settings {start, end, work_days}
 * @param {Array} holidays - Array of holiday date strings ['YYYY-MM-DD']
 * @param {Array} exclusions - Array of exclusion periods [{start_time, end_time}]
 * @returns {number} Net business minutes
 */
export function calculateNetBusinessMinutes(start, end, settings, holidays = [], exclusions = []) {
  if (!start) return 0;
  const startDate = new Date(start);
  const endDate = end ? new Date(end) : new Date();
  
  if (startDate > endDate) return 0;

  let totalMinutes = 0;
  
  // 1. Calculate Total Business Minutes (excluding non-working hours and weekends/holidays)
  // We'll iterate through each minute (or optimized by day)
  // For simplicity and accuracy with small durations, we'll iterate by day
  
  let current = new Date(startDate);
  
  while (current <= endDate) {
    const dayStr = current.toISOString().split('T')[0];
    const dayOfWeek = current.getDay();
    
    const isWorkDay = settings.work_days.includes(dayOfWeek);
    const isHoliday = holidays.includes(dayStr);
    
    if (isWorkDay && !isHoliday) {
      // Define working window for THIS day
      const workStart = new Date(current);
      const [sH, sM] = settings.start.split(':').map(Number);
      workStart.setHours(sH, sM, 0, 0);
      
      const workEnd = new Date(current);
      const [eH, eM] = settings.end.split(':').map(Number);
      workEnd.setHours(eH, eM, 0, 0);
      
      // The effective start and end for THIS day
      const effectiveStart = new Date(Math.max(current, workStart, startDate));
      const effectiveEnd = new Date(Math.min(endDate, workEnd));
      
      if (effectiveStart < effectiveEnd) {
        totalMinutes += (effectiveEnd - effectiveStart) / 60000;
      }
    }
    
    // Move to next day at midnight
    current.setDate(current.getDate() + 1);
    current.setHours(0, 0, 0, 0);
  }

  // 2. Subtract Exclusion Minutes (only those overlapping with Business Hours)
  let exclusionMinutes = 0;
  for (const ex of exclusions) {
    if (!ex.start_time) continue;
    const exStart = new Date(ex.start_time);
    const exEnd = ex.end_time ? new Date(ex.end_time) : new Date();
    
    // Find overlap of [exStart, exEnd] with [startDate, endDate]
    const overlapStart = new Date(Math.max(exStart, startDate));
    const overlapEnd = new Date(Math.min(exEnd, endDate));
    
    if (overlapStart < overlapEnd) {
      // Calculate business minutes within this exclusion period
      // (Using the same logic as above but within the overlap)
      exclusionMinutes += calculateNetBusinessMinutes(overlapStart, overlapEnd, settings, holidays, []);
    }
  }

  return Math.max(0, Math.round(totalMinutes - exclusionMinutes));
}

/**
 * Returns the SLA limit in minutes based on severity.
 * (This can be moved to settings later)
 */
export const SLA_LIMITS = {
  High: 4 * 60,      // 4 Hours
  Medium: 8 * 60,    // 8 Hours
  Low: 3 * 24 * 60,  // 3 Days (Business Hours)
};

/**
 * Checks if a case is compliant (Binary 0/1)
 */
export function isSLACompliant(netMinutes, severity) {
  const limit = SLA_LIMITS[severity] || SLA_LIMITS.Medium;
  return netMinutes <= limit;
}
