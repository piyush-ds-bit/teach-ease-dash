import { useState, useEffect } from "react";
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
  calculateBorrowerSummary, 
  formatInterestType, 
  formatRupees, 
  isLoanCleared,
  LendingLedgerEntry
} from "@/lib/lendingCalculation";
import { LendingStatusBadge } from "./LendingStatusBadge";
import { AddBorrowerDialog } from "./AddBorrowerDialog";

export function BorrowersTable() {
  const navigate = useNavigate();
  const [borrowers, setBorrowers] = useState<Borrower[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<Record<string, LendingLedgerEntry[]>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      // Load borrowers
      const { data: borrowersData, error: borrowersError } = await supabase
        .from('borrowers')
        .select('*')
        .order('created_at', { ascending: false });

      if (borrowersError) throw borrowersError;

      const typedBorrowers = (borrowersData || []) as Borrower[];
      setBorrowers(typedBorrowers);

      // Load all ledger entries
      const { data: ledgerData, error: ledgerError } = await supabase
        .from('lending_ledger')
        .select('*')
        .in('borrower_id', typedBorrowers.map(b => b.id));

      if (ledgerError) throw ledgerError;

      // Group entries by borrower_id
      const entriesByBorrower: Record<string, LendingLedgerEntry[]> = {};
      for (const entry of (ledgerData || []) as LendingLedgerEntry[]) {
        if (!entriesByBorrower[entry.borrower_id]) {
          entriesByBorrower[entry.borrower_id] = [];
        }
        entriesByBorrower[entry.borrower_id].push(entry);
      }
      setLedgerEntries(entriesByBorrower);
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
                  <TableHead className="hidden sm:table-cell">Principal</TableHead>
                  <TableHead className="hidden md:table-cell">Interest</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBorrowers.map((borrower) => {
                  const entries = ledgerEntries[borrower.id] || [];
                  const summary = calculateBorrowerSummary(borrower, entries);
                  const cleared = isLoanCleared(summary);

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
                            <p className="text-xs text-muted-foreground sm:hidden">
                              {formatRupees(borrower.principal_amount)}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {formatRupees(borrower.principal_amount)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="text-sm">
                          {formatInterestType(borrower.interest_type, borrower.interest_rate)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={summary.remainingBalance > 0 ? "text-red-600 font-medium" : "text-green-600 font-medium"}>
                          {formatRupees(summary.remainingBalance)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <LendingStatusBadge isCleared={cleared} />
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
