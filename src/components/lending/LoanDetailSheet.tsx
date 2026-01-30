import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Loan, 
  LendingLedgerEntry, 
  calculateLoanSummary, 
  formatInterestType, 
  formatRupees,
  isLoanCleared
} from "@/lib/lendingCalculation";
import { format, parseISO } from "date-fns";
import { Calendar, Banknote, TrendingUp, CreditCard, AlertCircle, CheckCircle } from "lucide-react";
import { LendingTimeline } from "./LendingTimeline";
import { AddPaymentDialog } from "./AddPaymentDialog";
import { EditPaymentDialog } from "./EditPaymentDialog";
import { DeletePaymentDialog } from "./DeletePaymentDialog";
import { SettleLoanButton } from "./SettleLoanButton";

interface LoanDetailSheetProps {
  loan: Loan | null;
  entries: LendingLedgerEntry[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRefresh: () => void;
}

export function LoanDetailSheet({ 
  loan, 
  entries, 
  open, 
  onOpenChange, 
  onRefresh 
}: LoanDetailSheetProps) {
  const [editEntry, setEditEntry] = useState<LendingLedgerEntry | null>(null);
  const [deleteEntry, setDeleteEntry] = useState<LendingLedgerEntry | null>(null);

  if (!loan) return null;

  const loanEntries = entries.filter(e => e.loan_id === loan.id);
  const summary = calculateLoanSummary(loan, loanEntries);
  const cleared = isLoanCleared(summary);
  const isSettled = loan.status === 'settled';

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="mb-6">
            <div className="flex items-center justify-between">
              <SheetTitle>Loan Details</SheetTitle>
              <Badge 
                variant={loan.status === 'active' ? 'default' : 'secondary'}
                className={loan.status === 'active' 
                  ? 'bg-green-500/10 text-green-700 border-green-500/30' 
                  : 'bg-muted text-muted-foreground'}
              >
                {loan.status === 'active' ? 'Active' : 'Settled'}
              </Badge>
            </div>
          </SheetHeader>

          {/* Loan Info */}
          <div className="space-y-6">
            <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Banknote className="h-4 w-4" />
                <span>Principal:</span>
                <span className="font-medium text-foreground">{formatRupees(loan.principal_amount)}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Start Date:</span>
                <span className="font-medium text-foreground">{format(parseISO(loan.start_date), 'dd MMM yyyy')}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                <span>Interest:</span>
                <span className="font-medium text-foreground">
                  {formatInterestType(loan.interest_type, loan.interest_rate)}
                </span>
              </div>
              {loan.settled_at && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle className="h-4 w-4" />
                  <span>Settled On:</span>
                  <span className="font-medium text-foreground">
                    {format(parseISO(loan.settled_at), 'dd MMM yyyy')}
                  </span>
                </div>
              )}
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">Principal</p>
                  <p className="text-lg font-bold">{formatRupees(summary.principal)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">Interest</p>
                  <p className="text-lg font-bold text-amber-600">{formatRupees(summary.interestAccrued)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">Total Paid</p>
                  <p className="text-lg font-bold text-green-600">{formatRupees(summary.totalPaid)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">Remaining</p>
                  <p className={`text-lg font-bold ${summary.remainingBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatRupees(summary.remainingBalance)}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Actions */}
            {!isSettled && (
              <div className="flex justify-between items-center gap-2">
                <AddPaymentDialog 
                  borrowerId={loan.borrower_id} 
                  loanId={loan.id}
                  onPaymentAdded={onRefresh} 
                />
                <SettleLoanButton 
                  loan={loan} 
                  remainingBalance={summary.remainingBalance}
                  onSettled={onRefresh}
                />
              </div>
            )}

            {isSettled && (
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
                <AlertCircle className="h-4 w-4" />
                <span>This loan is settled and read-only.</span>
              </div>
            )}

            {/* Timeline */}
            <LendingTimeline
              entries={loanEntries}
              onEditEntry={!isSettled ? (entry) => setEditEntry(entry) : undefined}
              onDeleteEntry={!isSettled ? (entry) => setDeleteEntry(entry) : undefined}
              readOnly={isSettled}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Edit/Delete Dialogs */}
      {editEntry && (
        <EditPaymentDialog
          entry={editEntry}
          borrowerId={loan.borrower_id}
          loanId={loan.id}
          open={!!editEntry}
          onOpenChange={(open) => !open && setEditEntry(null)}
          onPaymentUpdated={onRefresh}
        />
      )}
      {deleteEntry && (
        <DeletePaymentDialog
          entry={deleteEntry}
          borrowerId={loan.borrower_id}
          open={!!deleteEntry}
          onOpenChange={(open) => !open && setDeleteEntry(null)}
          onPaymentDeleted={onRefresh}
        />
      )}
    </>
  );
}
