import { supabase } from "@/integrations/supabase/client";
import { FeeHistoryEntry, getApplicableFee } from "@/lib/feeHistoryCalculation";

export type LedgerEntryType = 'FEE_DUE' | 'PAYMENT' | 'PAUSE' | 'UNPAUSE' | 'ADJUSTMENT';

export interface LedgerEntry {
  id: string;
  student_id: string;
  entry_type: LedgerEntryType;
  month_key: string;
  amount: number;
  description: string | null;
  created_at: string;
  metadata: Record<string, unknown>;
}

export interface LedgerSummary {
  totalDue: number;
  totalPaid: number;
  balance: number;
  pendingMonths: string[];
  paidMonths: string[];
  pausedMonths: string[];
}

/**
 * Formats month key (YYYY-MM) to readable format
 */
export const formatMonthKey = (monthKey: string): string => {
  const [year, month] = monthKey.split('-').map(Number);
  const date = new Date(year, month - 1);
  return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
};

/**
 * Generates month key from date
 */
export const getMonthKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  return `${year}-${month}`;
};

/**
 * Get all months between two dates (exclusive of start month, inclusive of end month)
 */
export const getMonthsBetween = (startDate: Date, endDate: Date): string[] => {
  const months: string[] = [];
  const current = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 1); // Start from month AFTER joining
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), 1); // Up to but NOT including current month
  
  while (current < end) {
    months.push(getMonthKey(current));
    current.setMonth(current.getMonth() + 1);
  }
  
  return months;
};

/**
 * Calculate summary from ledger entries
 */
export const calculateLedgerSummary = (entries: LedgerEntry[]): LedgerSummary => {
  const feeEntries = entries.filter(e => e.entry_type === 'FEE_DUE');
  const paymentEntries = entries.filter(e => e.entry_type === 'PAYMENT');
  const pauseEntries = entries.filter(e => e.entry_type === 'PAUSE');
  
  const totalDue = feeEntries.reduce((sum, e) => sum + Number(e.amount), 0);
  const totalPaid = paymentEntries.reduce((sum, e) => sum + Number(e.amount), 0);
  
  const paidMonths = paymentEntries.map(e => e.month_key);
  const pausedMonths = pauseEntries.map(e => e.month_key);
  
  // Pending months = fee due months that haven't been fully paid
  const feeMonths = feeEntries.map(e => e.month_key);
  const pendingMonths = feeMonths.filter(m => !paidMonths.includes(m));
  
  return {
    totalDue,
    totalPaid,
    balance: totalDue - totalPaid,
    pendingMonths,
    paidMonths,
    pausedMonths,
  };
};

/**
 * Generate fee due entries for a student based on their joining date
 * Now supports fee history for correct per-month fees
 */
export const generateFeeEntries = async (
  studentId: string,
  joiningDate: Date,
  monthlyFee: number,
  pausedMonths: string[] = [],
  feeHistory: FeeHistoryEntry[] = []
): Promise<LedgerEntry[]> => {
  const now = new Date();
  const monthsToCharge = getMonthsBetween(joiningDate, now);
  
  // Filter out paused months
  const chargeableMonths = monthsToCharge.filter(m => !pausedMonths.includes(m));
  
  // Get existing fee entries to avoid duplicates
  const { data: existingEntries } = await supabase
    .from('fee_ledger')
    .select('*')
    .eq('student_id', studentId)
    .eq('entry_type', 'FEE_DUE');
  
  const existingMonths = (existingEntries || []).map(e => e.month_key);
  const newMonths = chargeableMonths.filter(m => !existingMonths.includes(m));
  
  if (newMonths.length === 0) return [];

  // Get current user for teacher_id
  const { data: { user } } = await supabase.auth.getUser();
  
  // Use fee history to get correct fee for each month
  const newEntries = newMonths.map(month => {
    let feeForMonth = monthlyFee; // Default to current fee
    
    // If we have fee history, use it to get the correct fee for this month
    if (feeHistory.length > 0) {
      try {
        feeForMonth = getApplicableFee(month, feeHistory);
      } catch {
        // Fallback to monthlyFee if fee history lookup fails
        feeForMonth = monthlyFee;
      }
    }
    
    return {
      student_id: studentId,
      entry_type: 'FEE_DUE' as const,
      month_key: month,
      amount: feeForMonth,
      description: `Monthly fee for ${formatMonthKey(month)}`,
      teacher_id: user?.id || null,
    };
  });
  
  const { data, error } = await supabase
    .from('fee_ledger')
    .insert(newEntries)
    .select();
  
  if (error) {
    console.error('Error generating fee entries:', error);
    return [];
  }
  
  return data as LedgerEntry[];
};

/**
 * Add a payment entry to the ledger
 */
export const addPaymentEntry = async (
  studentId: string,
  monthKey: string,
  amount: number,
  paymentId: string,
  description?: string
): Promise<LedgerEntry | null> => {
  // Get current user for teacher_id
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('fee_ledger')
    .insert({
      student_id: studentId,
      entry_type: 'PAYMENT',
      month_key: monthKey,
      amount: amount,
      description: description || `Payment received for ${formatMonthKey(monthKey)}`,
      metadata: { payment_id: paymentId },
      teacher_id: user?.id || null,
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error adding payment entry:', error);
    return null;
  }
  
  return data as LedgerEntry;
};

/**
 * Add a pause entry to the ledger
 */
export const addPauseEntry = async (
  studentId: string,
  monthKey: string
): Promise<LedgerEntry | null> => {
  // Get current user for teacher_id
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('fee_ledger')
    .insert({
      student_id: studentId,
      entry_type: 'PAUSE',
      month_key: monthKey,
      amount: 0,
      description: `Fee paused for ${formatMonthKey(monthKey)}`,
      teacher_id: user?.id || null,
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error adding pause entry:', error);
    return null;
  }
  
  return data as LedgerEntry;
};

/**
 * Remove a pause entry from the ledger (unpause)
 */
export const removePauseEntry = async (
  studentId: string,
  monthKey: string
): Promise<boolean> => {
  const { error } = await supabase
    .from('fee_ledger')
    .delete()
    .eq('student_id', studentId)
    .eq('entry_type', 'PAUSE')
    .eq('month_key', monthKey);
  
  if (error) {
    console.error('Error removing pause entry:', error);
    return false;
  }
  
  return true;
};

/**
 * Delete a payment entry from the ledger
 */
export const deletePaymentEntry = async (paymentId: string): Promise<boolean> => {
  const { error } = await supabase
    .from('fee_ledger')
    .delete()
    .filter('metadata->payment_id', 'eq', paymentId);
  
  if (error) {
    console.error('Error deleting payment entry:', error);
    return false;
  }
  
  return true;
};

/**
 * Get all ledger entries for a student
 */
export const getStudentLedger = async (studentId: string): Promise<LedgerEntry[]> => {
  const { data, error } = await supabase
    .from('fee_ledger')
    .select('*')
    .eq('student_id', studentId)
    .order('month_key', { ascending: true })
    .order('created_at', { ascending: true });
  
  if (error) {
    console.error('Error fetching ledger:', error);
    return [];
  }
  
  return data as LedgerEntry[];
};

/**
 * Sync ledger with existing payments (for migration)
 */
export const syncLedgerWithPayments = async (studentId: string): Promise<void> => {
  // Get all payments for the student
  const { data: payments } = await supabase
    .from('payments')
    .select('*')
    .eq('student_id', studentId);
  
  if (!payments || payments.length === 0) return;
  
  // Get existing payment entries in ledger
  const { data: existingEntries } = await supabase
    .from('fee_ledger')
    .select('metadata')
    .eq('student_id', studentId)
    .eq('entry_type', 'PAYMENT');
  
  const existingPaymentIds = (existingEntries || [])
    .map(e => (e.metadata as Record<string, unknown>)?.payment_id)
    .filter(Boolean);

  // Get current user for teacher_id
  const { data: { user } } = await supabase.auth.getUser();
  
  // Add missing payment entries
  const newPaymentEntries = payments
    .filter(p => !existingPaymentIds.includes(p.id))
    .map(p => ({
      student_id: studentId,
      entry_type: 'PAYMENT' as const,
      month_key: p.month,
      amount: p.amount_paid,
      description: `Payment received for ${formatMonthKey(p.month)}`,
      metadata: { payment_id: p.id },
      created_at: p.payment_date,
      teacher_id: user?.id || p.teacher_id || null,
    }));
  
  if (newPaymentEntries.length > 0) {
    await supabase.from('fee_ledger').insert(newPaymentEntries);
  }
};

/**
 * Sync ledger with paused months (for migration)
 */
export const syncLedgerWithPausedMonths = async (
  studentId: string,
  pausedMonths: string[]
): Promise<void> => {
  if (!pausedMonths || pausedMonths.length === 0) return;
  
  // Get existing pause entries
  const { data: existingEntries } = await supabase
    .from('fee_ledger')
    .select('month_key')
    .eq('student_id', studentId)
    .eq('entry_type', 'PAUSE');
  
  const existingPausedMonths = (existingEntries || []).map(e => e.month_key);

  // Get current user for teacher_id
  const { data: { user } } = await supabase.auth.getUser();
  
  // Add missing pause entries
  const newPauseEntries = pausedMonths
    .filter(m => !existingPausedMonths.includes(m))
    .map(m => ({
      student_id: studentId,
      entry_type: 'PAUSE' as const,
      month_key: m,
      amount: 0,
      description: `Fee paused for ${formatMonthKey(m)}`,
      teacher_id: user?.id || null,
    }));
  
  if (newPauseEntries.length > 0) {
    await supabase.from('fee_ledger').insert(newPauseEntries);
  }
};

/**
 * Full ledger sync for a student - generates fees, syncs payments and pauses
 * Now supports fee history for correct per-month fees
 */
export const fullLedgerSync = async (
  studentId: string,
  joiningDate: Date,
  monthlyFee: number,
  pausedMonths: string[] = [],
  feeHistory: FeeHistoryEntry[] = []
): Promise<LedgerEntry[]> => {
  // Sync paused months first
  await syncLedgerWithPausedMonths(studentId, pausedMonths);
  
  // Sync payments
  await syncLedgerWithPayments(studentId);
  
  // Generate fee entries with fee history support
  await generateFeeEntries(studentId, joiningDate, monthlyFee, pausedMonths, feeHistory);
  
  // Return full ledger
  return getStudentLedger(studentId);
};
