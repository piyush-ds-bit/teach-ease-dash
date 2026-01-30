import { useState } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { CheckCircle } from "lucide-react";
import { Loan, formatRupees } from "@/lib/lendingCalculation";
import { useLoans } from "@/hooks/useLoans";

interface SettleLoanButtonProps {
  loan: Loan;
  remainingBalance: number;
  onSettled?: () => void;
}

export function SettleLoanButton({ loan, remainingBalance, onSettled }: SettleLoanButtonProps) {
  const { toast } = useToast();
  const { settleLoan } = useLoans(loan.borrower_id);
  const [loading, setLoading] = useState(false);

  const handleSettle = async () => {
    setLoading(true);
    
    try {
      // If there's a remaining balance, it will be written off as an adjustment
      const { error } = await settleLoan(loan.id, remainingBalance > 0 ? remainingBalance : undefined);
      
      if (error) throw error;

      toast({
        title: "Loan Settled",
        description: remainingBalance > 0 
          ? `Loan settled. ${formatRupees(remainingBalance)} was written off.`
          : "Loan marked as settled.",
      });

      onSettled?.();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to settle loan",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm">
          <CheckCircle className="h-4 w-4 mr-2" />
          Settle Loan
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Settle This Loan?</AlertDialogTitle>
          <AlertDialogDescription>
            {remainingBalance > 0 ? (
              <>
                This loan has a remaining balance of <strong>{formatRupees(remainingBalance)}</strong>.
                Settling will write off this amount and mark the loan as closed.
                <br /><br />
                This action cannot be undone.
              </>
            ) : (
              <>
                This loan is fully paid. Settling will mark it as closed.
                <br /><br />
                Settled loans cannot be edited.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleSettle} disabled={loading}>
            {loading ? "Settling..." : "Settle Loan"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
