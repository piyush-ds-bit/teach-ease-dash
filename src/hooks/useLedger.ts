import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  LedgerEntry,
  LedgerSummary,
  calculateLedgerSummary,
  fullLedgerSync,
  getStudentLedger,
} from '@/lib/ledgerCalculation';

interface UseLedgerOptions {
  studentId: string;
  joiningDate?: Date;
  monthlyFee?: number;
  pausedMonths?: string[];
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
      
      const ledgerEntries = await fullLedgerSync(
        studentId,
        joiningDate,
        monthlyFee,
        pausedMonths
      );
      setEntries(ledgerEntries);
      setSummary(calculateLedgerSummary(ledgerEntries));
    } catch (err) {
      console.error('Error syncing ledger:', err);
      setError('Failed to sync ledger data');
    } finally {
      setLoading(false);
    }
  }, [studentId, joiningDate, monthlyFee, pausedMonths]);

  // Initial load - sync if autoSync is enabled and we have the required data
  useEffect(() => {
    if (autoSync && joiningDate && monthlyFee) {
      syncLedger();
    } else {
      fetchLedger();
    }
  }, [autoSync, joiningDate, monthlyFee, syncLedger, fetchLedger]);

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
