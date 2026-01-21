import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
import { Eye } from "lucide-react";
import { calculateLoanSummary, formatRupees, type LendingLedgerEntry, type Loan } from "@/lib/lendingCalculation";

interface LoanHistoryTableProps {
  loans: Loan[];
  entriesByLoanId: Record<string, LendingLedgerEntry[]>;
  onViewLoan: (loan: Loan) => void;
  legacyEntries?: LendingLedgerEntry[];
}

export function LoanHistoryTable({ loans, entriesByLoanId, onViewLoan, legacyEntries }: LoanHistoryTableProps) {
  const sortedLoans = [...loans].sort((a, b) => {
    const d = new Date(b.start_date).getTime() - new Date(a.start_date).getTime();
    if (d !== 0) return d;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const hasLegacy = (legacyEntries?.length ?? 0) > 0;

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Start</TableHead>
            <TableHead>Principal</TableHead>
            <TableHead className="hidden sm:table-cell">Status</TableHead>
            <TableHead>Due</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedLoans.map((loan) => {
            const entries = entriesByLoanId[loan.id] || [];
            const summary = calculateLoanSummary(loan, entries);
            const statusVariant = loan.status === "active" ? "default" : "secondary";
            return (
              <TableRow key={loan.id}>
                <TableCell className="font-medium">{format(parseISO(loan.start_date), "dd MMM yyyy")}</TableCell>
                <TableCell>{formatRupees(loan.principal_amount)}</TableCell>
                <TableCell className="hidden sm:table-cell">
                  <Badge variant={statusVariant}>{loan.status === "active" ? "Active" : "Settled"}</Badge>
                </TableCell>
                <TableCell className={summary.remainingBalance > 0 ? "font-medium" : "text-muted-foreground"}>
                  {formatRupees(summary.remainingBalance)}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="sm" onClick={() => onViewLoan(loan)}>
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}

          {sortedLoans.length === 0 && !hasLegacy && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                No loans yet.
              </TableCell>
            </TableRow>
          )}

          {hasLegacy && (
            <TableRow>
              <TableCell colSpan={5} className="text-muted-foreground">
                Legacy ledger entries exist but are not linked to a loan yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
