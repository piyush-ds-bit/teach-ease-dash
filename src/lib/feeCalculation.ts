import { supabase } from "@/integrations/supabase/client";

/**
 * Calculate total payable amount from joining date to now
 * Business rules:
 * - Joining month becomes due AFTER it fully completes
 * - Current month is NEVER considered due (ongoing)
 * - Paused months do not generate fees
 * 
 * Example: Student joins Oct 1, today is Dec 15
 * - October → fully completed → DUE
 * - November → fully completed → DUE  
 * - December → ongoing → NOT DUE
 * - Total = 2 months due
 */
export const calculateTotalPayable = (
  joiningDate: Date,
  monthlyFee: number,
  pausedMonths: string[] = []
): number => {
  const now = new Date();
  
  const joiningYear = joiningDate.getFullYear();
  const joiningMonth = joiningDate.getMonth();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  
  // Start from joining month (it becomes due after it completes)
  const startMonth = new Date(joiningYear, joiningMonth, 1);
  // End before current month (current month is never due)
  const endMonth = new Date(currentYear, currentMonth, 1);
  
  if (startMonth >= endMonth) {
    return 0; // Joining month hasn't completed yet
  }
  
  // Count completed months from joining month up to (but not including) current month
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
  
  // Start from joining month (becomes due after completion)
  const startMonth = new Date(joiningYear, joiningMonth, 1);
  // End before current month
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
