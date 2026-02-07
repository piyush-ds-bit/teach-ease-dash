import { supabase } from "@/integrations/supabase/client";
import {
  FeeHistoryEntry,
  getFeeHistory,
  getApplicableFee,
  calculateTotalPayableWithHistory,
  getChargeableMonthsWithFees,
  getPartialDueInfoWithHistory,
} from "@/lib/feeHistoryCalculation";

/**
 * BUSINESS RULES (LOCKED):
 * - Joining month becomes due ONLY after it fully completes
 * - Current month is NEVER due
 * - Paused months do not generate fees
 * - Payments settle earliest months first
 * - Fee changes apply from current month forward (not retroactive)
 */

/**
 * Calculate total payable amount till now (LEGACY - uses single fee)
 * @deprecated Use calculateTotalPayableWithHistory for accurate multi-fee calculation
 */
export const calculateTotalPayable = (
  joiningDate: Date,
  monthlyFee: number,
  pausedMonths: string[] = []
): number => {
  const now = new Date();

  const startMonth = new Date(joiningDate.getFullYear(), joiningDate.getMonth(), 1);
  const endMonth = new Date(now.getFullYear(), now.getMonth(), 1); // current month excluded

  if (startMonth >= endMonth) return 0;

  let count = 0;
  const cursor = new Date(startMonth);

  while (cursor < endMonth) {
    const monthKey = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
    if (!pausedMonths.includes(monthKey)) {
      count++;
    }
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return count * monthlyFee;
};

/**
 * Get all chargeable months till now
 * (NOT unpaid — just chargeable)
 */
export const getChargeableMonths = (
  joiningDate: Date,
  pausedMonths: string[] = []
): string[] => {
  const now = new Date();

  const startMonth = new Date(joiningDate.getFullYear(), joiningDate.getMonth(), 1);
  const endMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  if (startMonth >= endMonth) return [];

  const months: string[] = [];
  const cursor = new Date(startMonth);

  while (cursor < endMonth) {
    const monthKey = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
    if (!pausedMonths.includes(monthKey)) {
      months.push(monthKey);
    }
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return months;
};

/**
 * Format YYYY-MM → Month Year
 */
export const formatMonthKey = (monthKey: string): string => {
  const [year, month] = monthKey.split("-").map(Number);
  if (!year || !month) return monthKey;
  return new Date(year, month - 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
};

export type PartialDueInfo = {
  isPartial: boolean;
  partialAmount: number;
  partialMonth: string;
  fullDueMonths: string[];
};

/**
 * CORE LOGIC for partial due (LEGACY - single fee)
 * @deprecated Use getPartialDueInfoWithHistory for accurate multi-fee calculation
 */
export const getPartialDueInfo = (
  totalDue: number,
  monthlyFee: number,
  chargeableMonths: string[],
  totalPaid: number
): PartialDueInfo => {
  if (totalDue <= 0 || chargeableMonths.length === 0) {
    return {
      isPartial: false,
      partialAmount: 0,
      partialMonth: "",
      fullDueMonths: [],
    };
  }

  // Payments always clear earliest months first
  const paidFullMonths = Math.floor(totalPaid / monthlyFee);
  const unpaidMonths = chargeableMonths.slice(paidFullMonths);

  const fullDueCount = Math.floor(totalDue / monthlyFee);
  const partialAmount = totalDue % monthlyFee;
  const isPartial = partialAmount > 0;

  const fullDueMonths = unpaidMonths
    .slice(0, fullDueCount)
    .map(formatMonthKey);

  const partialMonth =
    isPartial && unpaidMonths.length > fullDueCount
      ? formatMonthKey(unpaidMonths[fullDueCount])
      : "";

  return {
    isPartial,
    partialAmount,
    partialMonth,
    fullDueMonths,
  };
};

/**
 * Calculate total paid from payments table
 */
export const calculateTotalPaidFromPayments = (
  payments: { amount_paid: number }[]
): number => {
  return payments.reduce((sum, p) => sum + Number(p.amount_paid || 0), 0);
};

/**
 * SINGLE SOURCE OF TRUTH - Now with fee history support
 */
export const getStudentFeeData = async (studentId: string) => {
  const [studentResult, paymentsResult, feeHistoryResult] = await Promise.all([
    supabase.from("students").select("*").eq("id", studentId).single(),
    supabase.from("payments").select("amount_paid").eq("student_id", studentId),
    getFeeHistory(studentId),
  ]);

  if (!studentResult.data) return null;

  const student = studentResult.data;
  const payments = paymentsResult.data || [];
  const feeHistory = feeHistoryResult;

  const joiningDate = new Date(student.joining_date);
  const pausedMonths = student.paused_months || [];
  const monthlyFee = Number(student.monthly_fee); // Current fee for display

  // Use fee history for accurate calculation if available
  let totalPayable: number;
  let chargeableMonthsWithFees: { monthKey: string; fee: number }[] = [];

  if (feeHistory.length > 0) {
    totalPayable = calculateTotalPayableWithHistory(joiningDate, feeHistory, pausedMonths);
    chargeableMonthsWithFees = getChargeableMonthsWithFees(joiningDate, feeHistory, pausedMonths);
  } else {
    // Fallback to legacy calculation (shouldn't happen with proper backfill)
    totalPayable = calculateTotalPayable(joiningDate, monthlyFee, pausedMonths);
  }

  const totalPaid = calculateTotalPaidFromPayments(payments);
  const totalDue = Math.max(0, totalPayable - totalPaid);

  const chargeableMonths = getChargeableMonths(joiningDate, pausedMonths);

  // Use fee history for partial due if available
  let partialDueInfo: PartialDueInfo;
  if (feeHistory.length > 0) {
    const historyPartialInfo = getPartialDueInfoWithHistory(
      totalDue,
      chargeableMonthsWithFees,
      totalPaid
    );
    partialDueInfo = {
      ...historyPartialInfo,
      fullDueMonths: historyPartialInfo.fullDueMonths.map(formatMonthKey),
      partialMonth: historyPartialInfo.partialMonth ? formatMonthKey(historyPartialInfo.partialMonth) : "",
    };
  } else {
    partialDueInfo = getPartialDueInfo(
      totalDue,
      monthlyFee,
      chargeableMonths,
      totalPaid
    );
  }

  return {
    student,
    payments,
    feeHistory,
    totalPayable,
    totalPaid,
    totalDue,
    chargeableMonths: chargeableMonths.map(formatMonthKey),
    chargeableMonthsWithFees,
    partialDueInfo,
  };
};

// Re-export fee history types and functions for convenience
export type { FeeHistoryEntry };
export { getFeeHistory, getApplicableFee, calculateTotalPayableWithHistory };
