/**
 * Counts paused months that fall within the eligible billing period
 * Only counts months AFTER joining date and UP TO (but not including) current month
 */
export const countPausedMonthsInRange = (
  pausedMonths: string[] | null,
  joiningDate: Date,
  now: Date
): number => {
  if (!pausedMonths || pausedMonths.length === 0) return 0;

  return pausedMonths.filter(pm => {
    const [year, month] = pm.split('-').map(Number);
    const pausedDate = new Date(year, month - 1, 1); // First day of paused month
    
    // Create joining month start (first of joining month)
    const joiningMonthStart = new Date(joiningDate.getFullYear(), joiningDate.getMonth(), 1);
    
    // Create current month start (first of current month)
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Paused month must be AFTER joining month and BEFORE current month
    return pausedDate > joiningMonthStart && pausedDate < currentMonthStart;
  }).length;
};

/**
 * Formats a paused month string (YYYY-MM) to readable format (Month Year)
 */
export const formatPausedMonth = (monthKey: string): string => {
  const [year, month] = monthKey.split('-').map(Number);
  const date = new Date(year, month - 1);
  return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
};
