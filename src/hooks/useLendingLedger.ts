import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { LendingLedgerEntry, LedgerEntryType } from '@/lib/lendingCalculation';

export function useLendingLedger(borrowerId: string | undefined) {
  const [entries, setEntries] = useState<LendingLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadEntries = useCallback(async () => {
    if (!borrowerId) {
      setEntries([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('lending_ledger')
        .select('*')
        .eq('borrower_id', borrowerId)
        .order('entry_date', { ascending: true })
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;

      setEntries((data || []) as LendingLedgerEntry[]);
      setError(null);
    } catch (err) {
      setError(err as Error);
      console.error('Error loading lending ledger:', err);
    } finally {
      setLoading(false);
    }
  }, [borrowerId]);

  useEffect(() => {
    loadEntries();

    if (!borrowerId) return;

    // Set up real-time subscription
    const channel = supabase
      .channel(`lending_ledger_${borrowerId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lending_ledger',
          filter: `borrower_id=eq.${borrowerId}`,
        },
        () => {
          loadEntries();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [borrowerId, loadEntries]);

  const addEntry = async (
    entryType: LedgerEntryType,
    amount: number,
    entryDate: string,
    description?: string
  ) => {
    if (!borrowerId) return { error: new Error('No borrower ID') };

    const { error: insertError } = await supabase
      .from('lending_ledger')
      .insert({
        borrower_id: borrowerId,
        entry_type: entryType,
        amount,
        entry_date: entryDate,
        description: description || null,
      });

    if (!insertError) {
      await loadEntries();
    }

    return { error: insertError };
  };

  const updateEntry = async (
    entryId: string,
    updates: {
      amount?: number;
      entry_date?: string;
      description?: string | null;
    }
  ) => {
    const { error: updateError } = await supabase
      .from('lending_ledger')
      .update(updates)
      .eq('id', entryId);

    if (!updateError) {
      await loadEntries();
    }

    return { error: updateError };
  };

  const deleteEntry = async (entryId: string) => {
    const { error: deleteError } = await supabase
      .from('lending_ledger')
      .delete()
      .eq('id', entryId);

    if (!deleteError) {
      await loadEntries();
    }

    return { error: deleteError };
  };

  return {
    entries,
    loading,
    error,
    addEntry,
    updateEntry,
    deleteEntry,
    refresh: loadEntries,
  };
}
