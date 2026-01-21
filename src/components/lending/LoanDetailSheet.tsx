import { useMemo } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { LoanSummaryCard } from "@/components/lending/LoanSummaryCard";
import { LendingTimeline } from "@/components/lending/LendingTimeline";
import { AddLoanPaymentDialog } from "@/components/lending/AddLoanPaymentDialog";
import { calculateLoanSummary, formatInterestType, type LendingLedgerEntry, type Loan } from "@/lib/lendingCalculation";
import { format, parseISO } from "date-fns";
import { useLoanLedger } from "@/hooks/useLoanLedger";

interface LoanDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  borrowerId: string;
  loan: Loan | null;
  entries?: LendingLedgerEntry[];
}

export function LoanDetailSheet({ open, onOpenChange, borrowerId, loan, entries }: LoanDetailSheetProps) {
  const { entries: liveEntries } = useLoanLedger(loan?.id);

  const summary = useMemo(() => {
    if (!loan) return null;
    return calculateLoanSummary(loan, (entries ?? liveEntries) as LendingLedgerEntry[]);
  }, [loan, entries, liveEntries]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        {!loan || !summary ? null : (
          <>
            <SheetHeader>
              <SheetTitle>Loan Details</SheetTitle>
              <SheetDescription>
                Start: {format(parseISO(loan.start_date), "dd MMM yyyy")} • {formatInterestType(loan.interest_type, Number(loan.interest_rate ?? 0))}
              </SheetDescription>
            </SheetHeader>

            <div className="mt-5 space-y-5">
              <LoanSummaryCard
                principal={summary.principal}
                interestAccrued={summary.interestAccrued}
                totalPaid={summary.totalPaid}
                remainingBalance={summary.remainingBalance}
              />

              <div className="flex justify-end">
                <AddLoanPaymentDialog borrowerId={borrowerId} loanId={loan.id} disabled={loan.status === "settled"} />
              </div>

              <Separator />

              <LendingTimeline entries={(entries ?? liveEntries) as LendingLedgerEntry[]} />
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
