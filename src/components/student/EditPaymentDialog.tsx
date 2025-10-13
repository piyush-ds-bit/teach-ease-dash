import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type Payment = {
  id: string;
  month: string;
  amount_paid: number;
  payment_date: string;
  payment_mode: string;
  transaction_id: string | null;
  proof_image_url: string | null;
};

type EditPaymentDialogProps = {
  payment: Payment;
  onUpdate: () => void;
};

export const EditPaymentDialog = ({ payment, onUpdate }: EditPaymentDialogProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    month: payment.month,
    amount_paid: payment.amount_paid.toString(),
    payment_date: payment.payment_date,
    payment_mode: payment.payment_mode,
    transaction_id: payment.transaction_id || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from("payments")
        .update({
          month: formData.month,
          amount_paid: Number(formData.amount_paid),
          payment_date: formData.payment_date,
          payment_mode: formData.payment_mode,
          transaction_id: formData.transaction_id || null,
        })
        .eq("id", payment.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Payment updated successfully",
      });

      setOpen(false);
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Edit className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Payment Record</DialogTitle>
          <DialogDescription>
            Update the payment details below
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="month">Month *</Label>
              <Input
                id="month"
                value={formData.month}
                onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="amount">Amount Paid (₹) *</Label>
              <Input
                id="amount"
                type="number"
                min="0"
                value={formData.amount_paid}
                onChange={(e) => setFormData({ ...formData, amount_paid: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="date">Payment Date *</Label>
              <Input
                id="date"
                type="date"
                value={formData.payment_date}
                onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="mode">Payment Mode *</Label>
              <Select
                value={formData.payment_mode}
                onValueChange={(value) => setFormData({ ...formData, payment_mode: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="UPI">UPI</SelectItem>
                  <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="transaction">Transaction ID (Optional)</Label>
              <Input
                id="transaction"
                value={formData.transaction_id}
                onChange={(e) => setFormData({ ...formData, transaction_id: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? "Updating..." : "Update Payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
