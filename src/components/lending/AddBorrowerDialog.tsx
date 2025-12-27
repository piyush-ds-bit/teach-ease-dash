import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Upload, X } from "lucide-react";
import { InterestType } from "@/lib/lendingCalculation";

interface AddBorrowerDialogProps {
  onBorrowerAdded: () => void;
}

export function AddBorrowerDialog({ onBorrowerAdded }: AddBorrowerDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    contact_number: "",
    principal_amount: "",
    interest_type: "zero_interest" as InterestType,
    interest_rate: "",
    loan_start_date: new Date().toISOString().split('T')[0],
    duration_months: "",
    notes: "",
  });

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.principal_amount) {
      toast({
        title: "Error",
        description: "Name and principal amount are required",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Insert borrower
      const { data: borrower, error: borrowerError } = await supabase
        .from('borrowers')
        .insert({
          name: formData.name.trim(),
          contact_number: formData.contact_number.trim() || null,
          principal_amount: parseFloat(formData.principal_amount),
          interest_type: formData.interest_type,
          interest_rate: formData.interest_rate ? parseFloat(formData.interest_rate) : 0,
          loan_start_date: formData.loan_start_date,
          duration_months: formData.duration_months ? parseInt(formData.duration_months) : null,
          notes: formData.notes.trim() || null,
        })
        .select()
        .single();

      if (borrowerError) throw borrowerError;

      // Upload photo if selected
      if (selectedImage && borrower) {
        const fileExt = selectedImage.name.split('.').pop();
        const filePath = `${borrower.id}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('borrower-photos')
          .upload(filePath, selectedImage, { upsert: true });

        if (!uploadError) {
          // Use signed URL for private bucket (1 year expiry)
          const { data: signedUrlData } = await supabase.storage
            .from('borrower-photos')
            .createSignedUrl(filePath, 31536000);

          await supabase
            .from('borrowers')
            .update({ profile_photo_url: signedUrlData?.signedUrl || null })
            .eq('id', borrower.id);
        }
      }

      // Create principal ledger entry
      const { error: ledgerError } = await supabase
        .from('lending_ledger')
        .insert({
          borrower_id: borrower.id,
          entry_type: 'PRINCIPAL',
          amount: parseFloat(formData.principal_amount),
          entry_date: formData.loan_start_date,
          description: 'Initial loan given',
        });

      if (ledgerError) throw ledgerError;

      toast({
        title: "Success",
        description: "Borrower added successfully",
      });

      setOpen(false);
      setFormData({
        name: "",
        contact_number: "",
        principal_amount: "",
        interest_type: "zero_interest",
        interest_rate: "",
        loan_start_date: new Date().toISOString().split('T')[0],
        duration_months: "",
        notes: "",
      });
      clearImage();
      onBorrowerAdded();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add borrower",
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
          Add Borrower
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Borrower</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Profile Photo Upload */}
          <div className="space-y-2">
            <Label>Profile Photo</Label>
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={imagePreview || undefined} />
                <AvatarFallback className="text-lg">
                  {formData.name ? formData.name.charAt(0).toUpperCase() : "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                </Button>
                {imagePreview && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearImage}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Full Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter borrower name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact">Contact Number</Label>
            <Input
              id="contact"
              value={formData.contact_number}
              onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
              placeholder="Enter contact number"
            />
          </div>

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
              <Label htmlFor="rate">Interest Rate (% per annum)</Label>
              <Input
                id="rate"
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
            <Label htmlFor="start_date">Loan Start Date *</Label>
            <Input
              id="start_date"
              type="date"
              value={formData.loan_start_date}
              onChange={(e) => setFormData({ ...formData, loan_start_date: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration">Expected Duration (months)</Label>
            <Input
              id="duration"
              type="number"
              min="1"
              value={formData.duration_months}
              onChange={(e) => setFormData({ ...formData, duration_months: e.target.value })}
              placeholder="Optional"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any additional notes..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add Borrower"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
