import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";
import { InterestType } from "@/lib/lendingCalculation";
import { useLoans } from "@/hooks/useLoans";

interface AddLoanDialogProps {
  borrowerId: string;
  borrowerName: string;
  onLoanAdded?: () => void;
}

export function AddLoanDialog({ borrowerId, borrowerName, onLoanAdded }: AddLoanDialogProps) {
  const { toast } = useToast();
  const { addLoan } = useLoans(borrowerId);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    principal_amount: "",
    interest_type: "zero_interest" as InterestType,
    interest_rate: "",
    start_date: new Date().toISOString().split('T')[0],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.principal_amount || parseFloat(formData.principal_amount) <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid principal amount",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error, loan } = await addLoan(
        parseFloat(formData.principal_amount),
        formData.interest_type,
        formData.interest_rate ? parseFloat(formData.interest_rate) : 0,
        formData.start_date
      );

      if (error) throw error;

      toast({
        title: "Success",
        description: `New loan of ₹${formData.principal_amount} added for ${borrowerName}`,
      });

      setOpen(false);
      setFormData({
        principal_amount: "",
        interest_type: "zero_interest",
        interest_rate: "",
        start_date: new Date().toISOString().split('T')[0],
      });
      onLoanAdded?.();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add loan",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Loan
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Loan for {borrowerName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="principal">Principal Amount (₹) *</Label>
            <Input
              id="principal"
              type="number"
              min="1"
              value={formData.principal_amount}
              onChange={(e) => setFormData({ ...formData, principal_amount: e.target.value })}
              placeholder="Enter loan amount"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="interest_type">Interest Type</Label>
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
              <Label htmlFor="rate">
                Interest Rate (% per {formData.interest_type === 'simple_monthly' ? 'month' : 'year'})
              </Label>
              <Input
                id="rate"
                type="number"
                min="0"
                step="0.1"
                value={formData.interest_rate}
                onChange={(e) => setFormData({ ...formData, interest_rate: e.target.value })}
                placeholder="Enter rate"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="start_date">Loan Start Date *</Label>
            <Input
              id="start_date"
              type="date"
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add Loan"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
