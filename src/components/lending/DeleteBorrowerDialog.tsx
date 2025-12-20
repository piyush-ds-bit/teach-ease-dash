import { useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Borrower } from "@/lib/lendingCalculation";

interface DeleteBorrowerDialogProps {
  borrower: Borrower | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBorrowerDeleted: () => void;
}

export function DeleteBorrowerDialog({ 
  borrower, 
  open, 
  onOpenChange, 
  onBorrowerDeleted 
}: DeleteBorrowerDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!borrower) return;

    setLoading(true);

    try {
      const { error } = await supabase
        .from('borrowers')
        .delete()
        .eq('id', borrower.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Borrower deleted successfully",
      });

      onOpenChange(false);
      onBorrowerDeleted();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete borrower",
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
          <AlertDialogTitle>Delete Borrower</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete <strong>{borrower?.name}</strong>? 
            This will also delete all their payment history and cannot be undone.
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
