import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { LendingLedgerEntry } from "@/lib/lendingCalculation";
import { supabase } from "@/integrations/supabase/client";

interface EditPaymentDialogProps {
  entry: LendingLedgerEntry | null;
  borrowerId: string;
  loanId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPaymentUpdated?: () => void;
}

export function EditPaymentDialog({ 
  entry, 
  borrowerId,
  loanId,
  open, 
  onOpenChange, 
  onPaymentUpdated 
}: EditPaymentDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    amount: "",
    entry_date: "",
    description: "",
  });

  useEffect(() => {
    if (entry) {
      setFormData({
        amount: Math.abs(entry.amount).toString(),
        entry_date: entry.entry_date,
        description: entry.description || "",
      });
    }
  }, [entry]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!entry || !formData.amount || parseFloat(formData.amount) <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const amount = entry.entry_type === 'PAYMENT' 
        ? -Math.abs(parseFloat(formData.amount))
        : parseFloat(formData.amount);

      const { error } = await supabase
        .from('lending_ledger')
        .update({
          amount,
          entry_date: formData.entry_date,
          description: formData.description.trim() || null,
        })
        .eq('id', entry.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Entry updated successfully",
      });

      onOpenChange(false);
      onPaymentUpdated?.();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update entry",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Entry</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-amount">Amount (₹) *</Label>
            <Input
              id="edit-amount"
              type="number"
              min="1"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="Enter amount"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-date">Date *</Label>
            <Input
              id="edit-date"
              type="date"
              value={formData.entry_date}
              onChange={(e) => setFormData({ ...formData, entry_date: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Optional description..."
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Updating..." : "Update"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
