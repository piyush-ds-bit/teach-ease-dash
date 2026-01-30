import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Loan, 
  LendingLedgerEntry, 
  calculateLoanSummary, 
  formatInterestType, 
  formatRupees 
} from "@/lib/lendingCalculation";
import { Eye, Loader2 } from "lucide-react";
import { format, parseISO } from "date-fns";

interface LoansTableProps {
  loans: Loan[];
  entries: LendingLedgerEntry[];
  loading?: boolean;
  onViewLoan: (loan: Loan) => void;
  addLoanButton?: React.ReactNode;
}

export function LoansTable({ 
  loans, 
  entries, 
  loading, 
  onViewLoan,
  addLoanButton 
}: LoansTableProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg">Loan History</CardTitle>
          {addLoanButton}
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg">Loan History</CardTitle>
        {addLoanButton}
      </CardHeader>
      <CardContent>
        {loans.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No loans yet. Add a loan to get started.
          </div>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Start Date</TableHead>
                  <TableHead>Principal</TableHead>
                  <TableHead className="hidden sm:table-cell">Interest</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loans.map((loan, index) => {
                  const loanEntries = entries.filter(e => e.loan_id === loan.id);
                  const summary = calculateLoanSummary(loan, loanEntries);
                  
                  return (
                    <TableRow key={loan.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {format(parseISO(loan.start_date), 'dd MMM yyyy')}
                          </p>
                          <p className="text-xs text-muted-foreground sm:hidden">
                            {formatInterestType(loan.interest_type, loan.interest_rate)}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{formatRupees(loan.principal_amount)}</TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {formatInterestType(loan.interest_type, loan.interest_rate)}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={loan.status === 'active' ? 'default' : 'secondary'}
                          className={loan.status === 'active' 
                            ? 'bg-green-500/10 text-green-700 border-green-500/30' 
                            : 'bg-muted text-muted-foreground'}
                        >
                          {loan.status === 'active' ? 'Active' : 'Settled'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className={summary.remainingBalance > 0 ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>
                          {formatRupees(summary.remainingBalance)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onViewLoan(loan)}
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
