import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loan, LoanStatus, InterestType } from '@/lib/lendingCalculation';

export function useLoans(borrowerId: string | undefined) {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadLoans = useCallback(async () => {
    if (!borrowerId) {
      setLoans([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('loans')
        .select('*')
        .eq('borrower_id', borrowerId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setLoans((data || []) as Loan[]);
      setError(null);
    } catch (err) {
      setError(err as Error);
      console.error('Error loading loans:', err);
    } finally {
      setLoading(false);
    }
  }, [borrowerId]);

  useEffect(() => {
    loadLoans();

    if (!borrowerId) return;

    // Set up real-time subscription
    const channel = supabase
      .channel(`loans_${borrowerId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'loans',
          filter: `borrower_id=eq.${borrowerId}`,
        },
        () => {
          loadLoans();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [borrowerId, loadLoans]);

  const addLoan = async (
    principalAmount: number,
    interestType: InterestType,
    interestRate: number,
    startDate: string
  ) => {
    if (!borrowerId) return { error: new Error('No borrower ID'), loan: null };

    // Get current user for teacher_id
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: new Error('Not authenticated'), loan: null };

    // Create the loan
    const { data: loan, error: insertError } = await supabase
      .from('loans')
      .insert({
        borrower_id: borrowerId,
        principal_amount: principalAmount,
        interest_type: interestType,
        interest_rate: interestRate,
        start_date: startDate,
        status: 'active' as LoanStatus,
        teacher_id: user.id,
      })
      .select()
      .single();

    if (insertError || !loan) {
      return { error: insertError, loan: null };
    }

    // Create PRINCIPAL entry in lending_ledger
    const { error: ledgerError } = await supabase
      .from('lending_ledger')
      .insert({
        borrower_id: borrowerId,
        loan_id: loan.id,
        entry_type: 'PRINCIPAL',
        amount: principalAmount,
        entry_date: startDate,
        description: 'Initial loan given',
        teacher_id: user.id,
      });

    if (ledgerError) {
      console.error('Failed to create PRINCIPAL entry:', ledgerError);
    }

    await loadLoans();
    return { error: null, loan: loan as Loan };
  };

  const settleLoan = async (loanId: string, adjustmentAmount?: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: new Error('Not authenticated') };

    // If there's a remaining balance, create an adjustment entry to zero it
    if (adjustmentAmount && adjustmentAmount > 0) {
      const { error: adjustmentError } = await supabase
        .from('lending_ledger')
        .insert({
          borrower_id: borrowerId,
          loan_id: loanId,
          entry_type: 'ADJUSTMENT',
          amount: -adjustmentAmount, // Negative to reduce the balance
          entry_date: new Date().toISOString().split('T')[0],
          description: 'Balance adjustment on settlement',
          teacher_id: user.id,
        });

      if (adjustmentError) {
        return { error: adjustmentError };
      }
    }

    // Mark loan as settled
    const { error: updateError } = await supabase
      .from('loans')
      .update({
        status: 'settled' as LoanStatus,
        settled_at: new Date().toISOString(),
      })
      .eq('id', loanId);

    if (!updateError) {
      await loadLoans();
    }

    return { error: updateError };
  };

  const updateLoan = async (
    loanId: string,
    updates: Partial<Pick<Loan, 'interest_type' | 'interest_rate'>>
  ) => {
    const { error: updateError } = await supabase
      .from('loans')
      .update(updates)
      .eq('id', loanId);

    if (!updateError) {
      await loadLoans();
    }

    return { error: updateError };
  };

  const getActiveLoan = () => loans.find(l => l.status === 'active');

  return {
    loans,
    loading,
    error,
    addLoan,
    settleLoan,
    updateLoan,
    getActiveLoan,
    refresh: loadLoans,
  };
}

/**
 * Hook to fetch all loans (for dashboard summaries)
 */
export function useAllLoans() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLoans = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('loans')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLoans((data || []) as Loan[]);
    } catch (err) {
      console.error('Error loading all loans:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLoans();

    const channel = supabase
      .channel('all_loans')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'loans' }, loadLoans)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadLoans]);

  return { loans, loading, refresh: loadLoans };
}
