import { useState, useEffect } from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { BorrowersTable } from "@/components/lending/BorrowersTable";
import { Card, CardContent } from "@/components/ui/card";
import { Wallet, ArrowDownLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatRupees, LendingLedgerEntry } from "@/lib/lendingCalculation";

export default function Lending() {
  const [totalLended, setTotalLended] = useState(0);
  const [totalRecovered, setTotalRecovered] = useState(0);

  useEffect(() => {
    const loadSummary = async () => {
      // Get sum of all principal amounts from borrowers
      const { data: borrowers } = await supabase
        .from('borrowers')
        .select('principal_amount');
      
      const lended = (borrowers || []).reduce((sum, b) => sum + Number(b.principal_amount), 0);
      setTotalLended(lended);

      // Get sum of all payments from ledger
      const { data: ledger } = await supabase
        .from('lending_ledger')
        .select('amount, entry_type');
      
      const recovered = ((ledger || []) as LendingLedgerEntry[])
        .filter(e => e.entry_type === 'PAYMENT')
        .reduce((sum, e) => sum + Math.abs(Number(e.amount)), 0);
      setTotalRecovered(recovered);
    };

    loadSummary();

    // Real-time updates
    const channel = supabase
      .channel('lending_summary')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'borrowers' }, loadSummary)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lending_ledger' }, loadSummary)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Personal Lending</h1>
          <p className="text-muted-foreground">Track money you've lent to others</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="p-3 rounded-full bg-blue-500/10">
                <Wallet className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Lended</p>
                <p className="text-xl font-bold">{formatRupees(totalLended)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="p-3 rounded-full bg-green-500/10">
                <ArrowDownLeft className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Recovered</p>
                <p className="text-xl font-bold">{formatRupees(totalRecovered)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <BorrowersTable />
      </main>
    </div>
  );
}
