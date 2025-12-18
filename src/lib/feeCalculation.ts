import { supabase } from "@/integrations/supabase/client";

/**
 * Calculate total payable amount from joining date to now
 * Business rules:
 * - Joining month does NOT generate fee immediately
 * - Monthly fee is added only after one full month completes
 * - Current month is never considered due
 * - Paused months do not generate fees
 */
export const calculateTotalPayable = (
  joiningDate: Date,
  monthlyFee: number,
  pausedMonths: string[] = []
): number => {
  const now = new Date();
  
  // Calculate months between joining and now (excluding joining month and current month)
  const joiningYear = joiningDate.getFullYear();
  const joiningMonth = joiningDate.getMonth();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  
  // Total months from joining to now (excluding joining month)
  // e.g., joined Jan 2024, now is Apr 2024 -> Feb, Mar = 2 months due
  let totalMonths = (currentYear - joiningYear) * 12 + (currentMonth - joiningMonth);
  
  // Subtract 1 because joining month doesn't count, but we already exclude current month
  // So: joined Jan, now Apr -> (4-1) = 3 months, minus joining month = months Feb, Mar (2 months)
  // Actually the formula gives us 3, and current month (Apr) shouldn't be counted
  // So if joined Jan 2024 and now is Apr 2024: 3 months (Feb, Mar, Apr) but Apr is current so 2 months
  // Formula: (currentYear - joiningYear) * 12 + (currentMonth - joiningMonth) = 3
  // This counts Jan->Feb, Feb->Mar, Mar->Apr = 3 months but Apr is current, so we need -1? No wait...
  // Let me think again: Jan=0, Apr=3. Diff = 3. That's Feb(1), Mar(2), Apr(3) = 3 months from Jan
  // But joining month (Jan) doesn't generate fee, current month (Apr) doesn't generate fee
  // So billable = Feb, Mar = 2 months. Formula should be: diff - 1 for current month
  // But diff already doesn't include joining month in the count (it's the difference)
  // So totalMonths = 3 - 1 = 2 (for current month exclusion)? No...
  
  // Simpler approach: count months AFTER joining and BEFORE current month
  // Start from month after joining, end before current month
  const startMonth = new Date(joiningYear, joiningMonth + 1, 1); // Month after joining
  const endMonth = new Date(currentYear, currentMonth, 1); // Current month (exclusive)
  
  if (startMonth >= endMonth) {
    return 0; // No full months completed yet
  }
  
  // Count months
  let monthCount = 0;
  const cursor = new Date(startMonth);
  
  while (cursor < endMonth) {
    const monthKey = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
    
    // Only count if not paused
    if (!pausedMonths.includes(monthKey)) {
      monthCount++;
    }
    
    cursor.setMonth(cursor.getMonth() + 1);
  }
  
  return monthCount * monthlyFee;
};

/**
 * Get pending months list (months that are due)
 */
export const getPendingMonths = (
  joiningDate: Date,
  pausedMonths: string[] = []
): string[] => {
  const now = new Date();
  const joiningYear = joiningDate.getFullYear();
  const joiningMonth = joiningDate.getMonth();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  
  const startMonth = new Date(joiningYear, joiningMonth + 1, 1);
  const endMonth = new Date(currentYear, currentMonth, 1);
  
  if (startMonth >= endMonth) {
    return [];
  }
  
  const months: string[] = [];
  const cursor = new Date(startMonth);
  
  while (cursor < endMonth) {
    const monthKey = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
    
    if (!pausedMonths.includes(monthKey)) {
      months.push(monthKey);
    }
    
    cursor.setMonth(cursor.getMonth() + 1);
  }
  
  return months;
};

/**
 * Format month key (YYYY-MM) to readable format
 */
export const formatMonthKey = (monthKey: string): string => {
  const [year, month] = monthKey.split('-').map(Number);
  if (isNaN(year) || isNaN(month)) return monthKey;
  const date = new Date(year, month - 1);
  return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
};

/**
 * Calculate total paid from payments table
 */
export const calculateTotalPaidFromPayments = (
  payments: { amount_paid: number }[]
): number => {
  return payments.reduce((sum, p) => sum + Number(p.amount_paid), 0);
};

/**
 * Fetch and calculate all fee data for a student
 * This is the single source of truth for fee calculations
 */
export const getStudentFeeData = async (studentId: string) => {
  const [studentResult, paymentsResult] = await Promise.all([
    supabase.from('students').select('*').eq('id', studentId).single(),
    supabase.from('payments').select('*').eq('student_id', studentId),
  ]);
  
  if (!studentResult.data) {
    return null;
  }
  
  const student = studentResult.data;
  const payments = paymentsResult.data || [];
  
  const joiningDate = new Date(student.joining_date);
  const pausedMonths = student.paused_months || [];
  const monthlyFee = Number(student.monthly_fee);
  
  const totalPayable = calculateTotalPayable(joiningDate, monthlyFee, pausedMonths);
  const totalPaid = calculateTotalPaidFromPayments(payments);
  const totalDue = Math.max(0, totalPayable - totalPaid);
  const pendingMonths = getPendingMonths(joiningDate, pausedMonths);
  
  return {
    student,
    payments,
    totalPayable,
    totalPaid,
    totalDue,
    pendingMonths,
    pendingMonthsFormatted: pendingMonths.map(formatMonthKey),
  };
};
