import { useMemo, useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { BorrowerHeader } from "@/components/lending/BorrowerHeader";
import { BorrowerLifetimeSummaryCards } from "@/components/lending/BorrowerLifetimeSummaryCards";
import { LoanHistoryTable } from "@/components/lending/LoanHistoryTable";
import { LoanDetailSheet } from "@/components/lending/LoanDetailSheet";
import { EditBorrowerDialog } from "@/components/lending/EditBorrowerDialog";
import { DeleteBorrowerDialog } from "@/components/lending/DeleteBorrowerDialog";
import { useLendingLedger } from "@/hooks/useLendingLedger";
import { useBorrowerLoans } from "@/hooks/useBorrowerLoans";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
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
import {
  Borrower,
  Loan,
  calculateBorrowerSummary,
  calculateLoanSummary,
  formatInterestType,
  formatRupees,
} from "@/lib/lendingCalculation";
import { Loader2, Calendar } from "lucide-react";
import { format, parseISO } from "date-fns";

export default function BorrowerProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [borrower, setBorrower] = useState<Borrower | null>(null);
  const [loading, setLoading] = useState(true);
  const { entries } = useLendingLedger(id);
  const { loans } = useBorrowerLoans(id);

  // Dialog states
  const [editBorrowerOpen, setEditBorrowerOpen] = useState(false);
  const [deleteBorrowerOpen, setDeleteBorrowerOpen] = useState(false);
  const [activeLoanSheet, setActiveLoanSheet] = useState<Loan | null>(null);
  const [linkingLegacy, setLinkingLegacy] = useState(false);

  const loadBorrower = async () => {
    if (!id) return;
    
    const { data, error } = await supabase
      .from('borrowers')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      navigate('/lending');
      return;
    }

    setBorrower(data as Borrower);
    setLoading(false);
  };

  useEffect(() => {
    loadBorrower();
  }, [id]);

  const entriesByLoanId = useMemo(() => {
    const map: Record<string, typeof entries> = {};
    for (const entry of entries) {
      const loanId = (entry as any).loan_id as string | null | undefined;
      if (!loanId) continue;
      if (!map[loanId]) map[loanId] = [];
      map[loanId].push(entry);
    }
    return map;
  }, [entries]);

  const legacyEntries = useMemo(() => {
    return entries.filter((e) => !(e as any).loan_id);
  }, [entries]);

  const linkLegacyEntriesToLoans = async () => {
    if (!borrower) return;
    if (legacyEntries.length === 0) return;
    if (loans.length === 0) {
      toast({
        title: "No loans to link",
        description: "Create at least one loan for this borrower before linking legacy entries.",
        variant: "destructive",
      });
      return;
    }

    setLinkingLegacy(true);
    try {
      const { data, error } = await supabase.functions.invoke("lending-link-legacy", {
        body: { borrowerId: borrower.id },
      });

      if (error) throw error;
      const linked = Number((data as any)?.linked ?? legacyEntries.length);

      toast({
        title: "Legacy entries linked",
        description: `Linked ${linked} entries to existing loans.`,
      });
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to link legacy entries",
        variant: "destructive",
      });
    } finally {
      setLinkingLegacy(false);
    }
  };

  const activeLoan = useMemo(() => loans.find((l) => l.status === "active") || null, [loans]);
  const hasActiveLoan = !!activeLoan;

  const lifetimeTotals = useMemo(() => {
    const legacySummary = borrower
      ? calculateBorrowerSummary(borrower, legacyEntries)
      : { principal: 0, interestAccrued: 0, totalPaid: 0, totalDue: 0, remainingBalance: 0 };

    let totalBorrowed = 0;
    let totalRecovered = 0;
    let activeDue = 0;

    // Loans (new model)
    for (const loan of loans) {
      const s = calculateLoanSummary(loan, entriesByLoanId[loan.id] || []);
      totalBorrowed += Number(loan.principal_amount);
      totalRecovered += s.totalPaid;
      if (loan.status === "active") activeDue += s.remainingBalance;
    }

    // Legacy (loan_id is null)
    if (legacyEntries.length > 0 && loans.length === 0) {
      totalBorrowed += legacySummary.principal;
      totalRecovered += legacySummary.totalPaid;
      activeDue += legacySummary.remainingBalance;
    } else if (legacyEntries.length > 0) {
      // If both exist, keep legacy recovered to avoid losing old history
      totalRecovered += legacySummary.totalPaid;
    }

    return { totalBorrowed, totalRecovered, activeDue };
  }, [borrower, legacyEntries, loans, entriesByLoanId]);

  if (loading || !borrower) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <BorrowerHeader
          borrower={borrower}
          isCleared={!hasActiveLoan}
          onEdit={() => setEditBorrowerOpen(true)}
          onDelete={() => setDeleteBorrowerOpen(true)}
        />

        {/* Interest context (active loan if present, otherwise legacy borrower fields) */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Loan Start Date:</span>
            <span className="font-medium text-foreground">
              {format(parseISO(activeLoan?.start_date ?? borrower.loan_start_date), "dd MMM yyyy")}
            </span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Today's Date:</span>
            <span className="font-medium text-foreground">{format(new Date(), 'dd MMM yyyy')}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <span>Interest Type:</span>
            <span className="font-medium text-foreground">
              {formatInterestType(
                activeLoan?.interest_type ?? borrower.interest_type,
                Number(activeLoan?.interest_rate ?? borrower.interest_rate)
              )}
            </span>
          </div>
        </div>

        <BorrowerLifetimeSummaryCards
          totalBorrowed={lifetimeTotals.totalBorrowed}
          totalRecovered={lifetimeTotals.totalRecovered}
          activeDue={lifetimeTotals.activeDue}
        />

        <div className="space-y-3">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Loan History</h2>
              <p className="text-sm text-muted-foreground">All loans under this borrower</p>
            </div>
            {activeLoan && (
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Active Due</p>
                <p className="text-base font-semibold">{formatRupees(lifetimeTotals.activeDue)}</p>
              </div>
            )}
          </div>

          {legacyEntries.length > 0 && loans.length > 0 && (
            <div className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Legacy ledger entries detected</p>
                <p className="text-sm text-muted-foreground">
                  These entries have no loan ID yet. You can link them to existing loans (non-destructive).
                </p>
              </div>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" disabled={linkingLegacy}>
                    {linkingLegacy ? "Linking..." : "Link legacy entries"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Link legacy entries to loans?</AlertDialogTitle>
                    <AlertDialogDescription>
                      We’ll attach each legacy entry to the most recent loan that started on or before the entry date.
                      This does not delete or modify amounts—only fills the missing loan reference.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={linkingLegacy}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={linkLegacyEntriesToLoans} disabled={linkingLegacy}>
                      Confirm
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}

          <LoanHistoryTable
            loans={loans}
            entriesByLoanId={entriesByLoanId}
            legacyEntries={legacyEntries}
            onViewLoan={(loan) => setActiveLoanSheet(loan)}
          />
        </div>

        <LoanDetailSheet
          open={!!activeLoanSheet}
          onOpenChange={(open) => !open && setActiveLoanSheet(null)}
          borrowerId={borrower.id}
          loan={activeLoanSheet}
        />

        {/* Dialogs */}
        <EditBorrowerDialog
          borrower={borrower}
          open={editBorrowerOpen}
          onOpenChange={setEditBorrowerOpen}
          onBorrowerUpdated={loadBorrower}
        />
        <DeleteBorrowerDialog
          borrower={borrower}
          open={deleteBorrowerOpen}
          onOpenChange={setDeleteBorrowerOpen}
          onBorrowerDeleted={() => navigate('/lending')}
        />
      </main>
    </div>
  );
}
