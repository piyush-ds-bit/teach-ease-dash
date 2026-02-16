import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  LedgerEntry,
  LedgerSummary,
  calculateLedgerSummary,
  fullLedgerSync,
  getStudentLedger,
} from '@/lib/ledgerCalculation';
import { FeeHistoryEntry } from '@/lib/feeHistoryCalculation';

interface UseLedgerOptions {
  studentId: string;
  joiningDate?: Date;
  monthlyFee?: number;
  pausedMonths?: string[];
  feeHistory?: FeeHistoryEntry[];
  autoSync?: boolean;
}

interface UseLedgerReturn {
  entries: LedgerEntry[];
  summary: LedgerSummary;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  sync: () => Promise<void>;
}

export const useLedger = ({
  studentId,
  joiningDate,
  monthlyFee,
  pausedMonths = [],
  feeHistory = [],
  autoSync = true,
}: UseLedgerOptions): UseLedgerReturn => {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [summary, setSummary] = useState<LedgerSummary>({
    totalDue: 0,
    totalPaid: 0,
    balance: 0,
    pendingMonths: [],
    paidMonths: [],
    pausedMonths: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stabilize array dependencies using serialized refs
  const pausedMonthsRef = useRef<string>(JSON.stringify(pausedMonths));
  const feeHistoryRef = useRef<string>(JSON.stringify(feeHistory.map(f => ({ id: f.id, monthly_fee: f.monthly_fee, effective_from_month: f.effective_from_month }))));
  const hasSyncedRef = useRef(false);

  // Update refs when serialized values actually change
  const serializedPaused = JSON.stringify(pausedMonths);
  const serializedFeeHistory = JSON.stringify(feeHistory.map(f => ({ id: f.id, monthly_fee: f.monthly_fee, effective_from_month: f.effective_from_month })));
  
  if (serializedPaused !== pausedMonthsRef.current) {
    pausedMonthsRef.current = serializedPaused;
  }
  if (serializedFeeHistory !== feeHistoryRef.current) {
    feeHistoryRef.current = serializedFeeHistory;
  }

  const fetchLedger = useCallback(async () => {
    if (!studentId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const ledgerEntries = await getStudentLedger(studentId);
      setEntries(ledgerEntries);
      setSummary(calculateLedgerSummary(ledgerEntries));
    } catch (err) {
      console.error('Error fetching ledger:', err);
      setError('Failed to load ledger data');
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  const syncLedger = useCallback(async () => {
    if (!studentId || !joiningDate || !monthlyFee) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const currentPaused = JSON.parse(pausedMonthsRef.current) as string[];
      const currentFeeHistory = feeHistory;
      
      const ledgerEntries = await fullLedgerSync(
        studentId,
        joiningDate,
        monthlyFee,
        currentPaused,
        currentFeeHistory
      );
      setEntries(ledgerEntries);
      setSummary(calculateLedgerSummary(ledgerEntries));
    } catch (err) {
      console.error('Error syncing ledger:', err);
      setError('Failed to sync ledger data');
    } finally {
      setLoading(false);
    }
  }, [studentId, joiningDate, monthlyFee, feeHistory]);

  // Initial load - sync once when student data is ready
  useEffect(() => {
    if (!studentId) return;

    if (autoSync && joiningDate && monthlyFee && !hasSyncedRef.current) {
      hasSyncedRef.current = true;
      syncLedger();
    } else if (!autoSync || !joiningDate || !monthlyFee) {
      fetchLedger();
    }
  }, [studentId, autoSync, !!joiningDate, !!monthlyFee]);

  // Re-sync when paused months or fee history actually change (after initial sync)
  useEffect(() => {
    if (!studentId || !joiningDate || !monthlyFee || !hasSyncedRef.current) return;
    
    syncLedger();
  }, [pausedMonthsRef.current, feeHistoryRef.current]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!studentId) return;

    const channel = supabase
      .channel(`ledger-${studentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'fee_ledger',
          filter: `student_id=eq.${studentId}`,
        },
        () => {
          fetchLedger();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [studentId, fetchLedger]);

  return {
    entries,
    summary,
    loading,
    error,
    refresh: fetchLedger,
    sync: syncLedger,
  };
};
