import { supabase } from "@/integrations/supabase/client";

/**
 * Fee History Entry type
 */
export type FeeHistoryEntry = {
  id: string;
  student_id: string;
  monthly_fee: number;
  effective_from_month: string; // YYYY-MM
  created_at: string;
  teacher_id: string | null;
};

/**
 * Get the applicable fee for a specific month
 * Uses the most recent fee entry where effective_from_month <= targetMonth
 */
export const getApplicableFee = (
  targetMonth: string,
  feeHistory: FeeHistoryEntry[]
): number => {
  if (feeHistory.length === 0) {
    throw new Error("No fee history available for student");
  }

  // Filter entries where effective_from_month <= targetMonth
  const applicableEntries = feeHistory.filter(
    (entry) => entry.effective_from_month <= targetMonth
  );

  if (applicableEntries.length === 0) {
    // If no applicable entries, use the earliest fee (shouldn't happen with proper data)
    const sorted = [...feeHistory].sort(
      (a, b) => a.effective_from_month.localeCompare(b.effective_from_month)
    );
    return sorted[0].monthly_fee;
  }

  // Sort by effective_from_month descending and take the first (most recent)
  const sorted = [...applicableEntries].sort(
    (a, b) => b.effective_from_month.localeCompare(a.effective_from_month)
  );

  return sorted[0].monthly_fee;
};

/**
 * Fetch fee history for a student
 */
export const getFeeHistory = async (
  studentId: string
): Promise<FeeHistoryEntry[]> => {
  const { data, error } = await supabase
    .from("student_fee_history")
    .select("*")
    .eq("student_id", studentId)
    .order("effective_from_month", { ascending: true });

  if (error) {
    console.error("Error fetching fee history:", error);
    return [];
  }

  return data as FeeHistoryEntry[];
};

/**
 * Get current month key in YYYY-MM format
 */
export const getCurrentMonthKey = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  return `${year}-${month}`;
};

/**
 * Convert a date to month key (YYYY-MM)
 */
export const dateToMonthKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  return `${year}-${month}`;
};

/**
 * Calculate total payable using fee history
 * Each month is charged at the fee that was active during that month
 */
export const calculateTotalPayableWithHistory = (
  joiningDate: Date,
  feeHistory: FeeHistoryEntry[],
  pausedMonths: string[] = []
): number => {
  if (feeHistory.length === 0) {
    return 0;
  }

  const now = new Date();
  const startMonth = new Date(joiningDate.getFullYear(), joiningDate.getMonth(), 1);
  const endMonth = new Date(now.getFullYear(), now.getMonth(), 1); // current month excluded

  if (startMonth >= endMonth) return 0;

  let total = 0;
  const cursor = new Date(startMonth);

  while (cursor < endMonth) {
    const monthKey = dateToMonthKey(cursor);
    
    // Skip paused months
    if (!pausedMonths.includes(monthKey)) {
      const fee = getApplicableFee(monthKey, feeHistory);
      total += fee;
    }
    
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return total;
};

/**
 * Get all chargeable months with their applicable fees
 */
export const getChargeableMonthsWithFees = (
  joiningDate: Date,
  feeHistory: FeeHistoryEntry[],
  pausedMonths: string[] = []
): { monthKey: string; fee: number }[] => {
  if (feeHistory.length === 0) {
    return [];
  }

  const now = new Date();
  const startMonth = new Date(joiningDate.getFullYear(), joiningDate.getMonth(), 1);
  const endMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  if (startMonth >= endMonth) return [];

  const months: { monthKey: string; fee: number }[] = [];
  const cursor = new Date(startMonth);

  while (cursor < endMonth) {
    const monthKey = dateToMonthKey(cursor);
    
    if (!pausedMonths.includes(monthKey)) {
      const fee = getApplicableFee(monthKey, feeHistory);
      months.push({ monthKey, fee });
    }
    
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return months;
};

/**
 * Insert initial fee history entry for a new student
 */
export const insertInitialFeeHistory = async (
  studentId: string,
  monthlyFee: number,
  joiningDate: Date,
  teacherId: string
): Promise<boolean> => {
  const effectiveFromMonth = dateToMonthKey(joiningDate);

  const { error } = await supabase.from("student_fee_history").insert({
    student_id: studentId,
    monthly_fee: monthlyFee,
    effective_from_month: effectiveFromMonth,
    teacher_id: teacherId,
  });

  if (error) {
    console.error("Error inserting initial fee history:", error);
    return false;
  }

  return true;
};

/**
 * Insert a new fee history entry when fee changes
 * Always uses current month as effective_from_month
 */
export const insertFeeHistoryChange = async (
  studentId: string,
  newMonthlyFee: number,
  teacherId: string
): Promise<boolean> => {
  const effectiveFromMonth = getCurrentMonthKey();

  // Check if entry already exists for this month (upsert logic)
  const { data: existing } = await supabase
    .from("student_fee_history")
    .select("id")
    .eq("student_id", studentId)
    .eq("effective_from_month", effectiveFromMonth)
    .single();

  if (existing) {
    // Update existing entry for this month
    const { error } = await supabase
      .from("student_fee_history")
      .update({ monthly_fee: newMonthlyFee })
      .eq("id", existing.id);

    if (error) {
      console.error("Error updating fee history:", error);
      return false;
    }
  } else {
    // Insert new entry
    const { error } = await supabase.from("student_fee_history").insert({
      student_id: studentId,
      monthly_fee: newMonthlyFee,
      effective_from_month: effectiveFromMonth,
      teacher_id: teacherId,
    });

    if (error) {
      console.error("Error inserting fee history change:", error);
      return false;
    }
  }

  return true;
};

/**
 * Get partial due info with fee history support
 */
export const getPartialDueInfoWithHistory = (
  totalDue: number,
  chargeableMonthsWithFees: { monthKey: string; fee: number }[],
  totalPaid: number
): {
  isPartial: boolean;
  partialAmount: number;
  partialMonth: string;
  fullDueMonths: string[];
} => {
  if (totalDue <= 0 || chargeableMonthsWithFees.length === 0) {
    return {
      isPartial: false,
      partialAmount: 0,
      partialMonth: "",
      fullDueMonths: [],
    };
  }

  // Calculate which months are fully paid and which are pending
  let remainingPaid = totalPaid;
  let unpaidMonths: { monthKey: string; fee: number; remainingDue: number }[] = [];

  for (const month of chargeableMonthsWithFees) {
    if (remainingPaid >= month.fee) {
      remainingPaid -= month.fee;
    } else if (remainingPaid > 0) {
      // Partially paid month
      unpaidMonths.push({
        ...month,
        remainingDue: month.fee - remainingPaid,
      });
      remainingPaid = 0;
    } else {
      // Fully unpaid month
      unpaidMonths.push({
        ...month,
        remainingDue: month.fee,
      });
    }
  }

  if (unpaidMonths.length === 0) {
    return {
      isPartial: false,
      partialAmount: 0,
      partialMonth: "",
      fullDueMonths: [],
    };
  }

  // Check if first unpaid month is partial
  const firstUnpaid = unpaidMonths[0];
  const isPartial = firstUnpaid.remainingDue < firstUnpaid.fee;

  if (isPartial) {
    return {
      isPartial: true,
      partialAmount: firstUnpaid.remainingDue,
      partialMonth: firstUnpaid.monthKey,
      fullDueMonths: unpaidMonths.slice(1).map((m) => m.monthKey),
    };
  }

  return {
    isPartial: false,
    partialAmount: 0,
    partialMonth: "",
    fullDueMonths: unpaidMonths.map((m) => m.monthKey),
  };
};
