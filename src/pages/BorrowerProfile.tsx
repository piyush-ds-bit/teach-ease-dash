import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { BorrowerHeader } from "@/components/lending/BorrowerHeader";
import { LoanSummaryCard } from "@/components/lending/LoanSummaryCard";
import { LendingTimeline } from "@/components/lending/LendingTimeline";
import { AddPaymentDialog } from "@/components/lending/AddPaymentDialog";
import { EditBorrowerDialog } from "@/components/lending/EditBorrowerDialog";
import { DeleteBorrowerDialog } from "@/components/lending/DeleteBorrowerDialog";
import { EditPaymentDialog } from "@/components/lending/EditPaymentDialog";
import { DeletePaymentDialog } from "@/components/lending/DeletePaymentDialog";
import { useLendingLedger } from "@/hooks/useLendingLedger";
import { Borrower, calculateBorrowerSummary, isLoanCleared, LendingLedgerEntry, formatInterestType } from "@/lib/lendingCalculation";
import { Loader2, Calendar } from "lucide-react";
import { format, parseISO } from "date-fns";

export default function BorrowerProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [borrower, setBorrower] = useState<Borrower | null>(null);
  const [loading, setLoading] = useState(true);
  const { entries, refresh } = useLendingLedger(id);

  // Dialog states
  const [editBorrowerOpen, setEditBorrowerOpen] = useState(false);
  const [deleteBorrowerOpen, setDeleteBorrowerOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<LendingLedgerEntry | null>(null);
  const [deleteEntry, setDeleteEntry] = useState<LendingLedgerEntry | null>(null);

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

  const summary = calculateBorrowerSummary(borrower, entries);
  const cleared = isLoanCleared(summary);

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <BorrowerHeader
          borrower={borrower}
          isCleared={cleared}
          onEdit={() => setEditBorrowerOpen(true)}
          onDelete={() => setDeleteBorrowerOpen(true)}
        />

        {/* Loan Details Section */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Loan Start Date:</span>
            <span className="font-medium text-foreground">{format(parseISO(borrower.loan_start_date), 'dd MMM yyyy')}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Today's Date:</span>
            <span className="font-medium text-foreground">{format(new Date(), 'dd MMM yyyy')}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <span>Interest Type:</span>
            <span className="font-medium text-foreground">{formatInterestType(borrower.interest_type, borrower.interest_rate)}</span>
          </div>
        </div>

        <LoanSummaryCard
          principal={summary.principal}
          interestAccrued={summary.interestAccrued}
          totalPaid={summary.totalPaid}
          remainingBalance={summary.remainingBalance}
        />

        <div className="flex justify-end">
          <AddPaymentDialog borrowerId={borrower.id} onPaymentAdded={refresh} />
        </div>

        <LendingTimeline
          entries={entries}
          onEditEntry={(entry) => setEditEntry(entry)}
          onDeleteEntry={(entry) => setDeleteEntry(entry)}
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
        <EditPaymentDialog
          entry={editEntry}
          borrowerId={borrower.id}
          open={!!editEntry}
          onOpenChange={(open) => !open && setEditEntry(null)}
          onPaymentUpdated={refresh}
        />
        <DeletePaymentDialog
          entry={deleteEntry}
          borrowerId={borrower.id}
          open={!!deleteEntry}
          onOpenChange={(open) => !open && setDeleteEntry(null)}
          onPaymentDeleted={refresh}
        />
      </main>
    </div>
  );
}
