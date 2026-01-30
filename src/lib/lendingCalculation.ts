// Lending calculation utilities - completely independent from tuition logic

export type InterestType = 'simple_monthly' | 'simple_yearly' | 'zero_interest';
export type LoanStatus = 'active' | 'settled';
export type LedgerEntryType = 'PRINCIPAL' | 'INTEREST_ACCRUAL' | 'PAYMENT' | 'ADJUSTMENT';

export interface LendingLedgerEntry {
  id: string;
  borrower_id: string;
  loan_id: string | null;
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

export interface BorrowerLifetimeSummary {
  totalLent: number;
  totalPaid: number;
  totalOutstanding: number;
  activeLoansCount: number;
  settledLoansCount: number;
}

/**
 * Loan - represents a single loan instance
 * One borrower can have multiple loans
 */
export interface Loan {
  id: string;
  borrower_id: string;
  principal_amount: number;
  interest_type: InterestType;
  interest_rate: number;
  start_date: string;
  status: LoanStatus;
  settled_at: string | null;
  created_at: string;
  teacher_id: string | null;
  legacy_borrower_id: string | null;
}

/**
 * BorrowerPerson - represents a person (identity only)
 * No loan-specific data here
 */
export interface BorrowerPerson {
  id: string;
  name: string;
  profile_photo_url: string | null;
  contact_number: string | null;
  notes: string | null;
  created_at: string;
  merged_into_borrower_id: string | null;
}

/**
 * Legacy Borrower type (for backwards compatibility during migration)
 * @deprecated Use BorrowerPerson + Loan instead
 */
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
  teacher_id?: string | null;
}

/**
 * Calculate months elapsed since a start date, optionally until an end date
 */
export function getMonthsElapsed(startDate: string, endDate?: string): number {
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date();
  
  // Set both to start of day for accurate comparison
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  
  const yearDiff = end.getFullYear() - start.getFullYear();
  const monthDiff = end.getMonth() - start.getMonth();
  
  let totalMonths = yearDiff * 12 + monthDiff;
  
  // If we haven't reached the same day of month, subtract 1
  if (end.getDate() < start.getDate()) {
    totalMonths--;
  }
  
  return Math.max(0, totalMonths);
}

/**
 * Calculate years elapsed since a start date
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
 * For settled loans, interest is calculated up to settled_at date
 */
export function calculateInterest(
  principal: number,
  rate: number,
  interestType: InterestType,
  startDate: string,
  endDate?: string
): number {
  if (interestType === 'zero_interest' || rate <= 0) {
    return 0;
  }
  
  const rateDecimal = rate / 100;
  const months = getMonthsElapsed(startDate, endDate);
  
  if (interestType === 'simple_monthly') {
    // Interest = Principal × MonthlyRate × Months
    return principal * rateDecimal * months;
  }
  
  if (interestType === 'simple_yearly') {
    // Yearly rate prorated monthly: Interest = Principal × (YearlyRate / 12) × Months
    return principal * (rateDecimal / 12) * months;
  }
  
  return 0;
}

/**
 * Calculate lending summary from ledger entries (entries only, no interest calculation)
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
 * Calculate real-time summary for a LOAN (not borrower)
 * Uses loan data + ledger entries scoped to that loan
 */
export function calculateLoanSummary(
  loan: Loan,
  entries: LendingLedgerEntry[]
): LendingSummary {
  const ledgerSummary = calculateLendingSummary(entries);
  
  // For zero interest, just use ledger data
  if (loan.interest_type === 'zero_interest') {
    return {
      principal: loan.principal_amount,
      interestAccrued: 0,
      totalPaid: ledgerSummary.totalPaid,
      totalDue: loan.principal_amount,
      remainingBalance: Math.max(0, loan.principal_amount - ledgerSummary.totalPaid),
    };
  }
  
  // Calculate real-time interest (frozen at settled_at for settled loans)
  const endDate = loan.status === 'settled' && loan.settled_at 
    ? loan.settled_at 
    : undefined;
  
  const calculatedInterest = calculateInterest(
    loan.principal_amount,
    loan.interest_rate,
    loan.interest_type,
    loan.start_date,
    endDate
  );
  
  const totalDue = loan.principal_amount + calculatedInterest;
  const remainingBalance = totalDue - ledgerSummary.totalPaid;
  
  return {
    principal: loan.principal_amount,
    interestAccrued: calculatedInterest,
    totalPaid: ledgerSummary.totalPaid,
    totalDue,
    remainingBalance: Math.max(0, remainingBalance),
  };
}

/**
 * Calculate lifetime summary for a borrower across all their loans
 */
export function calculateBorrowerLifetimeSummary(
  loans: Loan[],
  allEntries: LendingLedgerEntry[]
): BorrowerLifetimeSummary {
  let totalLent = 0;
  let totalPaid = 0;
  let totalOutstanding = 0;
  let activeLoansCount = 0;
  let settledLoansCount = 0;
  
  for (const loan of loans) {
    const loanEntries = allEntries.filter(e => e.loan_id === loan.id);
    const summary = calculateLoanSummary(loan, loanEntries);
    
    totalLent += loan.principal_amount;
    totalPaid += summary.totalPaid;
    totalOutstanding += summary.remainingBalance;
    
    if (loan.status === 'active') {
      activeLoansCount++;
    } else {
      settledLoansCount++;
    }
  }
  
  return {
    totalLent,
    totalPaid,
    totalOutstanding,
    activeLoansCount,
    settledLoansCount,
  };
}

/**
 * @deprecated Use calculateLoanSummary instead
 * Calculate real-time summary for a borrower (legacy, uses borrower.principal_amount)
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
    return `${rate}% / month`;
  }
  
  if (type === 'simple_yearly') {
    return `${rate}% / year`;
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
