import { useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { LendingLedgerEntry, formatRupees } from "@/lib/lendingCalculation";
import { useLendingLedger } from "@/hooks/useLendingLedger";

interface DeletePaymentDialogProps {
  entry: LendingLedgerEntry | null;
  borrowerId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPaymentDeleted?: () => void;
}

export function DeletePaymentDialog({ 
  entry, 
  borrowerId,
  open, 
  onOpenChange, 
  onPaymentDeleted 
}: DeletePaymentDialogProps) {
  const { toast } = useToast();
  const { deleteEntry } = useLendingLedger(borrowerId);
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!entry) return;

    setLoading(true);

    try {
      const { error } = await deleteEntry(entry.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Entry deleted successfully",
      });

      onOpenChange(false);
      onPaymentDeleted?.();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete entry",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Entry</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this {entry?.entry_type.toLowerCase().replace('_', ' ')} entry 
            of {entry ? formatRupees(Math.abs(entry.amount)) : ''}? This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
