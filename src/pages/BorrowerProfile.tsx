import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { BorrowerInfoCard } from "@/components/lending/BorrowerInfoCard";
import { BorrowerLifetimeSummary } from "@/components/lending/BorrowerLifetimeSummary";
import { LoansTable } from "@/components/lending/LoansTable";
import { LoanDetailSheet } from "@/components/lending/LoanDetailSheet";
import { AddLoanDialog } from "@/components/lending/AddLoanDialog";
import { EditBorrowerDialog } from "@/components/lending/EditBorrowerDialog";
import { DeleteBorrowerDialog } from "@/components/lending/DeleteBorrowerDialog";
import { useLoans } from "@/hooks/useLoans";
import { useLendingLedger } from "@/hooks/useLendingLedger";
import { 
  BorrowerPerson, 
  Loan,
  calculateBorrowerLifetimeSummary,
} from "@/lib/lendingCalculation";
import { Loader2 } from "lucide-react";

export default function BorrowerProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [borrower, setBorrower] = useState<BorrowerPerson | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);

  // Fetch loans for this borrower
  const { loans, loading: loansLoading, refresh: refreshLoans } = useLoans(id);
  
  // Fetch ALL ledger entries for this borrower (across all loans)
  const { entries, refresh: refreshEntries } = useLendingLedger(id);

  // Dialog states
  const [editBorrowerOpen, setEditBorrowerOpen] = useState(false);
  const [deleteBorrowerOpen, setDeleteBorrowerOpen] = useState(false);

  const loadBorrower = async () => {
    if (!id) return;
    
    const { data, error } = await supabase
      .from('borrowers')
      .select('id, name, profile_photo_url, contact_number, notes, created_at, merged_into_borrower_id')
      .eq('id', id)
      .single();

    if (error || !data) {
      navigate('/lending');
      return;
    }

    setBorrower(data as BorrowerPerson);
    setLoading(false);
  };

  useEffect(() => {
    loadBorrower();
  }, [id]);

  const handleRefresh = () => {
    refreshLoans();
    refreshEntries();
  };

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

  // Calculate lifetime summary across all loans
  const lifetimeSummary = calculateBorrowerLifetimeSummary(loans, entries);

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Person Header */}
        <BorrowerInfoCard
          borrower={borrower}
          onEdit={() => setEditBorrowerOpen(true)}
          onDelete={() => setDeleteBorrowerOpen(true)}
        />

        {/* Lifetime Summary Cards */}
        <BorrowerLifetimeSummary summary={lifetimeSummary} />

        {/* Loans Table */}
        <LoansTable
          loans={loans}
          entries={entries}
          loading={loansLoading}
          onViewLoan={(loan) => setSelectedLoan(loan)}
          addLoanButton={
            <AddLoanDialog
              borrowerId={borrower.id}
              borrowerName={borrower.name}
              onLoanAdded={handleRefresh}
            />
          }
        />

        {/* Loan Detail Sheet */}
        <LoanDetailSheet
          loan={selectedLoan}
          entries={entries}
          open={!!selectedLoan}
          onOpenChange={(open) => !open && setSelectedLoan(null)}
          onRefresh={handleRefresh}
        />

        {/* Edit/Delete Borrower Dialogs */}
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
