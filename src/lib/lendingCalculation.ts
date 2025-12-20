// Lending calculation utilities - completely independent from tuition logic

export type InterestType = 'simple_monthly' | 'simple_yearly' | 'zero_interest';

export type LedgerEntryType = 'PRINCIPAL' | 'INTEREST_ACCRUAL' | 'PAYMENT' | 'ADJUSTMENT';

export interface LendingLedgerEntry {
  id: string;
  borrower_id: string;
  entry_type: LedgerEntryType;
  amount: number;
  description: string | null;
  entry_date: string;
  created_at: string;
  metadata: Record<string, unknown>;
}

export interface LendingSummary {
  principal: number;
  interestAccrued: number;
  totalPaid: number;
  totalDue: number;
  remainingBalance: number;
}

export interface Borrower {
  id: string;
  name: string;
  profile_photo_url: string | null;
  contact_number: string | null;
  principal_amount: number;
  interest_type: InterestType;
  interest_rate: number;
  loan_start_date: string;
  duration_months: number | null;
  notes: string | null;
  created_at: string;
}

/**
 * Calculate months elapsed since loan start date
 */
export function getMonthsElapsed(startDate: string): number {
  const start = new Date(startDate);
  const today = new Date();
  
  // Set both to start of day for accurate comparison
  start.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  
  const yearDiff = today.getFullYear() - start.getFullYear();
  const monthDiff = today.getMonth() - start.getMonth();
  
  let totalMonths = yearDiff * 12 + monthDiff;
  
  // If we haven't reached the same day of month, subtract 1
  if (today.getDate() < start.getDate()) {
    totalMonths--;
  }
  
  return Math.max(0, totalMonths);
}

/**
 * Calculate years elapsed since loan start date
 */
export function getYearsElapsed(startDate: string): number {
  const start = new Date(startDate);
  const today = new Date();
  
  start.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  
  let years = today.getFullYear() - start.getFullYear();
  
  // Adjust if we haven't reached the anniversary date
  const startMonth = start.getMonth();
  const startDay = start.getDate();
  const todayMonth = today.getMonth();
  const todayDay = today.getDate();
  
  if (todayMonth < startMonth || (todayMonth === startMonth && todayDay < startDay)) {
    years--;
  }
  
  return Math.max(0, years);
}

/**
 * Calculate simple interest based on type
 * For monthly: Interest = Principal × (Rate/100) × (Months/12)
 * For yearly: Interest = Principal × (Rate/100) × Years
 */
export function calculateInterest(
  principal: number,
  rate: number,
  interestType: InterestType,
  startDate: string
): number {
  if (interestType === 'zero_interest' || rate <= 0) {
    return 0;
  }
  
  const rateDecimal = rate / 100;
  
  if (interestType === 'simple_monthly') {
    const months = getMonthsElapsed(startDate);
    return principal * rateDecimal * (months / 12);
  }
  
  if (interestType === 'simple_yearly') {
    const years = getYearsElapsed(startDate);
    return principal * rateDecimal * years;
  }
  
  return 0;
}

/**
 * Calculate lending summary from ledger entries
 * Ledger is the single source of truth
 */
export function calculateLendingSummary(entries: LendingLedgerEntry[]): LendingSummary {
  let principal = 0;
  let interestAccrued = 0;
  let totalPaid = 0;
  
  for (const entry of entries) {
    switch (entry.entry_type) {
      case 'PRINCIPAL':
        principal += entry.amount;
        break;
      case 'INTEREST_ACCRUAL':
        interestAccrued += entry.amount;
        break;
      case 'PAYMENT':
        totalPaid += Math.abs(entry.amount); // Payments stored as negative
        break;
      case 'ADJUSTMENT':
        // Adjustments can be positive (add to due) or negative (reduce due)
        if (entry.amount > 0) {
          interestAccrued += entry.amount;
        } else {
          totalPaid += Math.abs(entry.amount);
        }
        break;
    }
  }
  
  const totalDue = principal + interestAccrued;
  const remainingBalance = totalDue - totalPaid;
  
  return {
    principal,
    interestAccrued,
    totalPaid,
    totalDue,
    remainingBalance: Math.max(0, remainingBalance),
  };
}

/**
 * Calculate real-time summary for a borrower
 * Combines ledger data with calculated interest
 */
export function calculateBorrowerSummary(
  borrower: Borrower,
  entries: LendingLedgerEntry[]
): LendingSummary {
  const ledgerSummary = calculateLendingSummary(entries);
  
  // For zero interest, just use ledger data
  if (borrower.interest_type === 'zero_interest') {
    return {
      principal: borrower.principal_amount,
      interestAccrued: 0,
      totalPaid: ledgerSummary.totalPaid,
      totalDue: borrower.principal_amount,
      remainingBalance: Math.max(0, borrower.principal_amount - ledgerSummary.totalPaid),
    };
  }
  
  // Calculate real-time interest
  const calculatedInterest = calculateInterest(
    borrower.principal_amount,
    borrower.interest_rate,
    borrower.interest_type,
    borrower.loan_start_date
  );
  
  const totalDue = borrower.principal_amount + calculatedInterest;
  const remainingBalance = totalDue - ledgerSummary.totalPaid;
  
  return {
    principal: borrower.principal_amount,
    interestAccrued: calculatedInterest,
    totalPaid: ledgerSummary.totalPaid,
    totalDue,
    remainingBalance: Math.max(0, remainingBalance),
  };
}

/**
 * Format interest type for display
 */
export function formatInterestType(type: InterestType, rate: number): string {
  if (type === 'zero_interest') {
    return 'Zero Interest';
  }
  
  if (type === 'simple_monthly') {
    return `${rate}% p.a. (Monthly)`;
  }
  
  if (type === 'simple_yearly') {
    return `${rate}% p.a. (Yearly)`;
  }
  
  return 'Unknown';
}

/**
 * Check if loan is fully cleared
 */
export function isLoanCleared(summary: LendingSummary): boolean {
  return summary.remainingBalance <= 0;
}

/**
 * Format currency in Indian Rupees
 */
export function formatRupees(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { 
    minimumFractionDigits: 0,
    maximumFractionDigits: 2 
  })}`;
}
