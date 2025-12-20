import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Borrower, InterestType } from "@/lib/lendingCalculation";

interface EditBorrowerDialogProps {
  borrower: Borrower | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBorrowerUpdated: () => void;
}

export function EditBorrowerDialog({ 
  borrower, 
  open, 
  onOpenChange, 
  onBorrowerUpdated 
}: EditBorrowerDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    contact_number: "",
    interest_type: "zero_interest" as InterestType,
    interest_rate: "",
    duration_months: "",
    notes: "",
  });

  useEffect(() => {
    if (borrower) {
      setFormData({
        name: borrower.name,
        contact_number: borrower.contact_number || "",
        interest_type: borrower.interest_type,
        interest_rate: borrower.interest_rate?.toString() || "",
        duration_months: borrower.duration_months?.toString() || "",
        notes: borrower.notes || "",
      });
    }
  }, [borrower]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!borrower || !formData.name.trim()) {
      toast({
        title: "Error",
        description: "Name is required",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('borrowers')
        .update({
          name: formData.name.trim(),
          contact_number: formData.contact_number.trim() || null,
          interest_type: formData.interest_type,
          interest_rate: formData.interest_rate ? parseFloat(formData.interest_rate) : 0,
          duration_months: formData.duration_months ? parseInt(formData.duration_months) : null,
          notes: formData.notes.trim() || null,
        })
        .eq('id', borrower.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Borrower updated successfully",
      });

      onOpenChange(false);
      onBorrowerUpdated();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update borrower",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Borrower</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Full Name *</Label>
            <Input
              id="edit-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter borrower name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-contact">Contact Number</Label>
            <Input
              id="edit-contact"
              value={formData.contact_number}
              onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
              placeholder="Enter contact number"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-interest_type">Interest Type</Label>
            <Select
              value={formData.interest_type}
              onValueChange={(value: InterestType) => setFormData({ ...formData, interest_type: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select interest type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="zero_interest">Zero Interest</SelectItem>
                <SelectItem value="simple_monthly">Simple Interest (Monthly)</SelectItem>
                <SelectItem value="simple_yearly">Simple Interest (Yearly)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.interest_type !== 'zero_interest' && (
            <div className="space-y-2">
              <Label htmlFor="edit-rate">Interest Rate (% per annum)</Label>
              <Input
                id="edit-rate"
                type="number"
                min="0"
                step="0.1"
                value={formData.interest_rate}
                onChange={(e) => setFormData({ ...formData, interest_rate: e.target.value })}
                placeholder="Enter annual rate"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="edit-duration">Expected Duration (months)</Label>
            <Input
              id="edit-duration"
              type="number"
              min="1"
              value={formData.duration_months}
              onChange={(e) => setFormData({ ...formData, duration_months: e.target.value })}
              placeholder="Optional"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-notes">Notes</Label>
            <Textarea
              id="edit-notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any additional notes..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Updating..." : "Update Borrower"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
