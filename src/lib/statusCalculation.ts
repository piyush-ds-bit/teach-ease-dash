import { getMonthKey } from "./ledgerCalculation";

export type StudentStatus = 'active' | 'paused' | 'inactive';

export interface StatusInfo {
  status: StudentStatus;
  label: string;
  color: string;
  bgColor: string;
  description: string;
}

// Inactivity threshold in days
const INACTIVITY_THRESHOLD_DAYS = 60;

/**
 * Check if a student is currently paused (paused for the current month)
 */
export const isCurrentlyPaused = (pausedMonths: string[] | null): boolean => {
  if (!pausedMonths || pausedMonths.length === 0) return false;
  
  const currentMonthKey = getMonthKey(new Date());
  return pausedMonths.includes(currentMonthKey);
};

/**
 * Check if a student is inactive (no payment in last N days)
 */
export const isInactive = (lastPaymentDate: string | null): boolean => {
  if (!lastPaymentDate) return true; // No payments ever = inactive
  
  const lastPayment = new Date(lastPaymentDate);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - lastPayment.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays > INACTIVITY_THRESHOLD_DAYS;
};

/**
 * Calculate student status based on paused months and last payment
 */
export const calculateStudentStatus = (
  pausedMonths: string[] | null,
  lastPaymentDate: string | null
): StudentStatus => {
  // Priority 1: Check if currently paused
  if (isCurrentlyPaused(pausedMonths)) {
    return 'paused';
  }
  
  // Priority 2: Check if inactive (no recent payments)
  if (isInactive(lastPaymentDate)) {
    return 'inactive';
  }
  
  // Default: Active
  return 'active';
};

/**
 * Get status display information
 */
export const getStatusInfo = (status: StudentStatus): StatusInfo => {
  switch (status) {
    case 'active':
      return {
        status: 'active',
        label: 'Active',
        color: 'text-emerald-700 dark:text-emerald-400',
        bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
        description: 'Student is actively enrolled',
      };
    case 'paused':
      return {
        status: 'paused',
        label: 'Paused',
        color: 'text-amber-700 dark:text-amber-400',
        bgColor: 'bg-amber-100 dark:bg-amber-900/30',
        description: 'Fee is paused for current month',
      };
    case 'inactive':
      return {
        status: 'inactive',
        label: 'Inactive',
        color: 'text-rose-700 dark:text-rose-400',
        bgColor: 'bg-rose-100 dark:bg-rose-900/30',
        description: 'No payment in last 60 days',
      };
  }
};

/**
 * Get status from student data with payments
 */
export const getStudentStatusFromData = (
  pausedMonths: string[] | null,
  payments: { payment_date: string }[]
): StudentStatus => {
  // Find the most recent payment date
  const sortedPayments = [...payments].sort(
    (a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
  );
  const lastPaymentDate = sortedPayments[0]?.payment_date || null;
  
  return calculateStudentStatus(pausedMonths, lastPaymentDate);
};
