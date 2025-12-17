import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { paymentSchema } from "@/lib/validation";
import { addPaymentEntry, getMonthKey } from "@/lib/ledgerCalculation";

type AddPaymentDialogProps = {
  studentId: string;
  onPaymentAdded: () => void;
};

export const AddPaymentDialog = ({ studentId, onPaymentAdded }: AddPaymentDialogProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    month: new Date().toLocaleString("default", { month: "long", year: "numeric" }),
    amount_paid: "",
    payment_date: new Date().toISOString().split("T")[0],
    payment_mode: "Cash",
    transaction_id: "",
    proof_image: null as File | null,
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData({ ...formData, proof_image: e.target.files[0] });
    }
  };

  const uploadProof = async (file: File): Promise<string | null> => {
    try {
      setUploading(true);
      const fileExt = file.name.split(".").pop();
      const fileName = `${studentId}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("payment-proofs")
        .upload(fileName, file);

      if (uploadError) throw uploadError;
      return fileName;
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  // Convert month string to YYYY-MM format for ledger
  const convertMonthToKey = (monthStr: string): string => {
    const date = new Date(monthStr);
    if (isNaN(date.getTime())) {
      // Try parsing "Month Year" format
      const parts = monthStr.split(' ');
      if (parts.length === 2) {
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                          'July', 'August', 'September', 'October', 'November', 'December'];
        const monthIndex = monthNames.findIndex(m => m.toLowerCase() === parts[0].toLowerCase());
        if (monthIndex !== -1) {
          const year = parseInt(parts[1]);
          return `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
        }
      }
      return getMonthKey(new Date());
    }
    return getMonthKey(date);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validationResult = paymentSchema.safeParse({
        month: formData.month,
        amount_paid: Number(formData.amount_paid),
        payment_date: formData.payment_date,
        payment_mode: formData.payment_mode,
        transaction_id: formData.transaction_id || null,
      });

      if (!validationResult.success) {
        const errors = validationResult.error.errors.map(e => e.message).join(", ");
        throw new Error(errors);
      }

      let proofUrl = null;
      if (formData.proof_image) {
        proofUrl = await uploadProof(formData.proof_image);
      }

      const { data: paymentData, error } = await supabase.from("payments").insert({
        student_id: studentId,
        month: validationResult.data.month,
        amount_paid: validationResult.data.amount_paid,
        payment_date: validationResult.data.payment_date,
        payment_mode: validationResult.data.payment_mode,
        transaction_id: validationResult.data.transaction_id,
        proof_image_url: proofUrl,
      }).select().single();

      if (error) throw error;

      // Add ledger entry for the payment
      if (paymentData) {
        const monthKey = convertMonthToKey(validationResult.data.month);
        await addPaymentEntry(
          studentId,
          monthKey,
          validationResult.data.amount_paid,
          paymentData.id,
          `Payment of ₹${validationResult.data.amount_paid} via ${validationResult.data.payment_mode}`
        );
      }

      toast({
        title: "Success",
        description: "Payment added successfully",
      });

      setOpen(false);
      setFormData({
        month: new Date().toLocaleString("default", { month: "long", year: "numeric" }),
        amount_paid: "",
        payment_date: new Date().toISOString().split("T")[0],
        payment_mode: "Cash",
        transaction_id: "",
        proof_image: null,
      });
      
      onPaymentAdded();
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
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Payment
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Payment Record</DialogTitle>
          <DialogDescription>
            Record a new payment for this student
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
            <div className="grid gap-2">
              <Label htmlFor="proof">Payment Proof (Optional)</Label>
              <Input
                id="proof"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading || uploading}>
              {loading || uploading ? "Adding..." : "Add Payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
