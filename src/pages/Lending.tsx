import { useState, useEffect } from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { BorrowersTable } from "@/components/lending/BorrowersTable";
import { Card, CardContent } from "@/components/ui/card";
import { Wallet, ArrowDownLeft, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatRupees, Loan, LendingLedgerEntry, calculateLoanSummary } from "@/lib/lendingCalculation";

export default function Lending() {
  const [totalLent, setTotalLent] = useState(0);
  const [totalRecovered, setTotalRecovered] = useState(0);
  const [totalOutstanding, setTotalOutstanding] = useState(0);

  useEffect(() => {
    const loadSummary = async () => {
      // Get all active loans with their principals
      const { data: loansRaw } = await supabase
        .from('loans')
        .select('*');
      
      const loans = (loansRaw || []) as Loan[];
      
      // Get all ledger entries
      const { data: entriesRaw } = await supabase
        .from('lending_ledger')
        .select('*');
      
      const entries = (entriesRaw || []) as LendingLedgerEntry[];

      // Calculate totals
      let lent = 0;
      let recovered = 0;
      let outstanding = 0;

      for (const loan of loans) {
        lent += loan.principal_amount;
        
        const loanEntries = entries.filter(e => e.loan_id === loan.id);
        const summary = calculateLoanSummary(loan, loanEntries);
        
        recovered += summary.totalPaid;
        
        if (loan.status === 'active') {
          outstanding += summary.remainingBalance;
        }
      }

      setTotalLent(lent);
      setTotalRecovered(recovered);
      setTotalOutstanding(outstanding);
    };

    loadSummary();

    // Real-time updates
    const channel = supabase
      .channel('lending_summary')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'loans' }, loadSummary)
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="p-3 rounded-full bg-primary/10">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Lent</p>
                <p className="text-xl font-bold">{formatRupees(totalLent)}</p>
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
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="p-3 rounded-full bg-amber-500/10">
                <TrendingUp className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Outstanding</p>
                <p className={`text-xl font-bold ${totalOutstanding > 0 ? 'text-destructive' : 'text-green-600'}`}>
                  {formatRupees(totalOutstanding)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <BorrowersTable />
      </main>
    </div>
  );
}
