import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Search, Eye, Loader2 } from "lucide-react";
import { 
  Borrower, 
  Loan,
  calculateBorrowerSummary,
  calculateLoanSummary,
  formatRupees, 
  LendingLedgerEntry
} from "@/lib/lendingCalculation";
import { LendingStatusBadge } from "./LendingStatusBadge";
import { AddLoanDialog } from "./AddLoanDialog";

export function BorrowersTable() {
  const navigate = useNavigate();
  const [borrowers, setBorrowers] = useState<Borrower[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<LendingLedgerEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      // Load borrowers
      const { data: borrowersData, error: borrowersError } = await supabase
        .from('borrowers')
        .select('*')
        .is('merged_into_borrower_id', null)
        .order('created_at', { ascending: false });

      if (borrowersError) throw borrowersError;

      const typedBorrowers = (borrowersData || []) as Borrower[];
      setBorrowers(typedBorrowers);

      if (typedBorrowers.length === 0) {
        setLoans([]);
        setLedgerEntries([]);
        return;
      }

      const { data: loansData } = await supabase
        .from('loans')
        .select('*')
        .in('borrower_id', typedBorrowers.map((b) => b.id));
      setLoans((loansData || []) as Loan[]);

      const { data: ledgerData, error: ledgerError } = await supabase
        .from('lending_ledger')
        .select('*')
        .in('borrower_id', typedBorrowers.map((b) => b.id));

      if (ledgerError) throw ledgerError;
      setLedgerEntries((ledgerData || []) as LendingLedgerEntry[]);
    } catch (error) {
      console.error('Error loading borrowers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Set up real-time subscription
    const borrowersChannel = supabase
      .channel('borrowers_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'borrowers' }, loadData)
      .subscribe();

    const ledgerChannel = supabase
      .channel('lending_ledger_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lending_ledger' }, loadData)
      .subscribe();

    return () => {
      supabase.removeChannel(borrowersChannel);
      supabase.removeChannel(ledgerChannel);
    };
  }, []);

  const filteredBorrowers = borrowers.filter(b =>
    b.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeLoanByBorrowerId = useMemo(() => {
    const map = new Map<string, Loan>();
    for (const loan of loans) {
      if (loan.status !== 'active') continue;
      const existing = map.get(loan.borrower_id);
      if (!existing) {
        map.set(loan.borrower_id, loan);
        continue;
      }
      if (new Date(loan.start_date).getTime() > new Date(existing.start_date).getTime()) {
        map.set(loan.borrower_id, loan);
      }
    }
    return map;
  }, [loans]);

  const entriesByLoanId = useMemo(() => {
    const map: Record<string, LendingLedgerEntry[]> = {};
    for (const entry of ledgerEntries) {
      const loanId = (entry as any).loan_id as string | null | undefined;
      if (!loanId) continue;
      if (!map[loanId]) map[loanId] = [];
      map[loanId].push(entry);
    }
    return map;
  }, [ledgerEntries]);

  const legacyEntriesByBorrowerId = useMemo(() => {
    const map: Record<string, LendingLedgerEntry[]> = {};
    for (const entry of ledgerEntries) {
      const loanId = (entry as any).loan_id as string | null | undefined;
      if (loanId) continue;
      if (!map[entry.borrower_id]) map[entry.borrower_id] = [];
      map[entry.borrower_id].push(entry);
    }
    return map;
  }, [ledgerEntries]);

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
        <AddLoanDialog borrowers={borrowers} onCompleted={loadData} />
      </CardHeader>
      <CardContent>
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search borrowers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {filteredBorrowers.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {borrowers.length === 0 
              ? "No borrowers yet. Add one to get started." 
              : "No borrowers match your search."}
          </div>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden sm:table-cell">Active Loan</TableHead>
                  <TableHead>Active Due</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBorrowers.map((borrower) => {
                  const activeLoan = activeLoanByBorrowerId.get(borrower.id) || null;
                  const legacyEntries = legacyEntriesByBorrowerId[borrower.id] || [];

                  const activeSummary = activeLoan
                    ? calculateLoanSummary(activeLoan, entriesByLoanId[activeLoan.id] || [])
                    : calculateBorrowerSummary(borrower, legacyEntries);

                  const hasActiveLoan = !!activeLoan;

                  return (
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
                            {borrower.contact_number && (
                              <p className="text-xs text-muted-foreground sm:hidden">{borrower.contact_number}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {activeLoan ? formatRupees(activeLoan.principal_amount) : "—"}
                      </TableCell>
                      <TableCell>
                        <span className={activeSummary.remainingBalance > 0 ? "font-medium" : "text-muted-foreground"}>
                          {formatRupees(activeSummary.remainingBalance)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <LendingStatusBadge isCleared={!hasActiveLoan} />
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
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
