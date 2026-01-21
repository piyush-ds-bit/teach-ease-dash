import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Loan } from "@/lib/lendingCalculation";

export function useBorrowerLoans(borrowerId: string | undefined) {
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
        .from("loans")
        .select("*")
        .eq("borrower_id", borrowerId)
        .order("start_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;
      setLoans((data || []) as Loan[]);
      setError(null);
    } catch (err) {
      setError(err as Error);
      console.error("Error loading loans:", err);
    } finally {
      setLoading(false);
    }
  }, [borrowerId]);

  useEffect(() => {
    loadLoans();
    if (!borrowerId) return;

    const channel = supabase
      .channel(`loans_${borrowerId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "loans",
          filter: `borrower_id=eq.${borrowerId}`,
        },
        () => loadLoans()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [borrowerId, loadLoans]);

  return { loans, loading, error, refresh: loadLoans };
}
