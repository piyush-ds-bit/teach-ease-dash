import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Search, Eye, Loader2 } from "lucide-react";
import { 
  BorrowerPerson,
  Loan,
  LendingLedgerEntry,
  calculateLoanSummary,
  formatRupees,
} from "@/lib/lendingCalculation";
import { AddBorrowerDialog } from "./AddBorrowerDialog";

interface BorrowerWithSummary {
  borrower: BorrowerPerson;
  activeLoansCount: number;
  totalOutstanding: number;
}

export function BorrowersTable() {
  const navigate = useNavigate();
  const [borrowersData, setBorrowersData] = useState<BorrowerWithSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      // Load borrowers (only non-merged ones)
      const { data: borrowersRaw, error: borrowersError } = await supabase
        .from('borrowers')
        .select('id, name, profile_photo_url, contact_number, notes, created_at, merged_into_borrower_id')
        .is('merged_into_borrower_id', null)
        .order('created_at', { ascending: false });

      if (borrowersError) throw borrowersError;

      const borrowers = (borrowersRaw || []) as BorrowerPerson[];

      // Load all loans
      const { data: loansRaw, error: loansError } = await supabase
        .from('loans')
        .select('*')
        .in('borrower_id', borrowers.map(b => b.id));

      if (loansError) throw loansError;
      const loans = (loansRaw || []) as Loan[];

      // Load all ledger entries for these borrowers
      const { data: entriesRaw, error: entriesError } = await supabase
        .from('lending_ledger')
        .select('*')
        .in('borrower_id', borrowers.map(b => b.id));

      if (entriesError) throw entriesError;
      const entries = (entriesRaw || []) as LendingLedgerEntry[];

      // Calculate summary for each borrower
      const summaries: BorrowerWithSummary[] = borrowers.map(borrower => {
        const borrowerLoans = loans.filter(l => l.borrower_id === borrower.id);
        const activeLoans = borrowerLoans.filter(l => l.status === 'active');
        
        let totalOutstanding = 0;
        for (const loan of activeLoans) {
          const loanEntries = entries.filter(e => e.loan_id === loan.id);
          const summary = calculateLoanSummary(loan, loanEntries);
          totalOutstanding += summary.remainingBalance;
        }

        return {
          borrower,
          activeLoansCount: activeLoans.length,
          totalOutstanding,
        };
      });

      setBorrowersData(summaries);
    } catch (error) {
      console.error('Error loading borrowers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Set up real-time subscriptions
    const borrowersChannel = supabase
      .channel('borrowers_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'borrowers' }, loadData)
      .subscribe();

    const loansChannel = supabase
      .channel('loans_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'loans' }, loadData)
      .subscribe();

    const ledgerChannel = supabase
      .channel('lending_ledger_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lending_ledger' }, loadData)
      .subscribe();

    return () => {
      supabase.removeChannel(borrowersChannel);
      supabase.removeChannel(loansChannel);
      supabase.removeChannel(ledgerChannel);
    };
  }, []);

  const filteredBorrowers = borrowersData.filter(({ borrower }) =>
    borrower.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (borrower.contact_number && borrower.contact_number.includes(searchQuery))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-xl">Borrowers</CardTitle>
        <AddBorrowerDialog onBorrowerAdded={loadData} />
      </CardHeader>
      <CardContent>
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {filteredBorrowers.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {borrowersData.length === 0 
              ? "No borrowers yet. Add one to get started." 
              : "No borrowers match your search."}
          </div>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden sm:table-cell">Phone</TableHead>
                  <TableHead>Active Loans</TableHead>
                  <TableHead>Outstanding</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBorrowers.map(({ borrower, activeLoansCount, totalOutstanding }) => (
                  <TableRow key={borrower.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={borrower.profile_photo_url || undefined} />
                          <AvatarFallback>
                            {borrower.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{borrower.name}</p>
                          <p className="text-xs text-muted-foreground sm:hidden">
                            {borrower.contact_number || 'No phone'}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {borrower.contact_number || '-'}
                    </TableCell>
                    <TableCell>
                      {activeLoansCount > 0 ? (
                        <Badge className="bg-primary/10 text-primary border-primary/30">
                          {activeLoansCount} Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-muted text-muted-foreground">
                          No Active Loan
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={totalOutstanding > 0 ? 'text-destructive font-medium' : 'text-green-600 font-medium'}>
                        {formatRupees(totalOutstanding)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/borrower/${borrower.id}`)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
