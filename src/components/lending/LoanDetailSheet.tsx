import { useMemo, useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { LoanSummaryCard } from "@/components/lending/LoanSummaryCard";
import { LendingTimeline } from "@/components/lending/LendingTimeline";
import { AddLoanPaymentDialog } from "@/components/lending/AddLoanPaymentDialog";
import { calculateLoanSummary, formatInterestType, type LendingLedgerEntry, type Loan } from "@/lib/lendingCalculation";
import { format, parseISO } from "date-fns";
import { useLoanLedger } from "@/hooks/useLoanLedger";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface LoanDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  borrowerId: string;
  loan: Loan | null;
  entries?: LendingLedgerEntry[];
}

export function LoanDetailSheet({ open, onOpenChange, borrowerId, loan, entries }: LoanDetailSheetProps) {
  const { toast } = useToast();
  const { entries: liveEntries, addEntry } = useLoanLedger(loan?.id);
  const [settling, setSettling] = useState(false);

  const summary = useMemo(() => {
    if (!loan) return null;
    return calculateLoanSummary(loan, (entries ?? liveEntries) as LendingLedgerEntry[]);
  }, [loan, entries, liveEntries]);

  const handleSettleLoan = async () => {
    if (!loan || !summary) return;
    if (loan.status === "settled") return;

    setSettling(true);
    try {
      const remaining = Number(summary.remainingBalance);
      const entryDate = new Date().toISOString().split("T")[0];

      // Optional settlement adjustment: if there's a remaining due, write a negative ADJUSTMENT
      // to bring the ledger to a cleared state.
      if (remaining > 0) {
        const { error: adjError } = await addEntry(
          borrowerId,
          "ADJUSTMENT",
          -Math.abs(remaining),
          entryDate,
          "Settlement adjustment"
        );
        if (adjError) throw adjError;
      }

      const { error: settleError } = await supabase
        .from("loans")
        .update({ status: "settled", settled_at: new Date().toISOString() } as any)
        .eq("id", loan.id);

      if (settleError) throw settleError;

      toast({ title: "Loan settled", description: "This loan is now locked as read-only." });
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to settle loan",
        variant: "destructive",
      });
    } finally {
      setSettling(false);
    }
  };

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

              <div className="flex items-center justify-between gap-3">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={loan.status === "settled" || settling}>
                      {settling ? "Settling..." : "Settle Loan"}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Settle this loan?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will mark the loan as <span className="font-medium">settled</span> and lock it as read-only.
                        {summary.remainingBalance > 0
                          ? " If there is any remaining due, a settlement adjustment will be recorded to clear the balance."
                          : ""}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={settling}>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleSettleLoan} disabled={settling}>
                        Confirm
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

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
