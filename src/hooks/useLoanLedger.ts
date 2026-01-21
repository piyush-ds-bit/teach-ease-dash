import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { LendingLedgerEntry, LedgerEntryType } from "@/lib/lendingCalculation";

export function useLoanLedger(loanId: string | undefined) {
  const [entries, setEntries] = useState<LendingLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadEntries = useCallback(async () => {
    if (!loanId) {
      setEntries([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from("lending_ledger")
        .select("*")
        .eq("loan_id", loanId)
        .order("entry_date", { ascending: true })
        .order("created_at", { ascending: true });

      if (fetchError) throw fetchError;
      setEntries((data || []) as LendingLedgerEntry[]);
      setError(null);
    } catch (err) {
      setError(err as Error);
      console.error("Error loading loan ledger:", err);
    } finally {
      setLoading(false);
    }
  }, [loanId]);

  useEffect(() => {
    loadEntries();
    if (!loanId) return;

    const channel = supabase
      .channel(`loan_ledger_${loanId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "lending_ledger",
          filter: `loan_id=eq.${loanId}`,
        },
        () => loadEntries()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loanId, loadEntries]);

  const addEntry = async (
    borrowerId: string,
    entryType: LedgerEntryType,
    amount: number,
    entryDate: string,
    description?: string
  ) => {
    if (!loanId) return { error: new Error("No loan ID") };

    const { data: auth } = await supabase.auth.getUser();
    const teacherId = auth.user?.id ?? null;

    const { error: insertError } = await supabase.from("lending_ledger").insert({
      borrower_id: borrowerId,
      loan_id: loanId,
      entry_type: entryType,
      amount,
      entry_date: entryDate,
      description: description || null,
      teacher_id: teacherId,
    } as any);

    if (!insertError) await loadEntries();
    return { error: insertError };
  };

  return { entries, loading, error, addEntry, refresh: loadEntries };
}
