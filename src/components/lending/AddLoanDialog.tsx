import { useEffect, useMemo, useRef, useState } from "react";
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
import type { Borrower, InterestType, Loan } from "@/lib/lendingCalculation";

interface AddLoanDialogProps {
  borrowers: Borrower[];
  onCompleted: () => void;
}

type Mode = "existing" | "new";

export function AddLoanDialog({ borrowers, onCompleted }: AddLoanDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<Mode>("existing");
  const [selectedBorrowerId, setSelectedBorrowerId] = useState<string>("");

  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [borrowerForm, setBorrowerForm] = useState({ name: "", contact_number: "", notes: "" });
  const [loanForm, setLoanForm] = useState({
    principal_amount: "",
    interest_type: "zero_interest" as InterestType,
    interest_rate: "",
    start_date: new Date().toISOString().split("T")[0],
  });

  const selectableBorrowers = useMemo(
    () => borrowers.filter((b) => !(b as any).merged_into_borrower_id),
    [borrowers]
  );
  const selectedBorrower = useMemo(
    () => selectableBorrowers.find((b) => b.id === selectedBorrowerId) || null,
    [selectableBorrowers, selectedBorrowerId]
  );

  useEffect(() => {
    if (!open) {
      setMode("existing");
      setSelectedBorrowerId("");
      setBorrowerForm({ name: "", contact_number: "", notes: "" });
      setLoanForm({
        principal_amount: "",
        interest_type: "zero_interest",
        interest_rate: "",
        start_date: new Date().toISOString().split("T")[0],
      });
      setSelectedImage(null);
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [open]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedImage(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const createBorrowerIfNeeded = async (): Promise<Borrower> => {
    if (mode === "existing") {
      if (!selectedBorrower) throw new Error("Please select a borrower");
      return selectedBorrower;
    }

    if (!borrowerForm.name.trim()) throw new Error("Borrower name is required");

    const { data: auth } = await supabase.auth.getUser();
    const teacherId = auth.user?.id ?? null;

    // Current DB still requires legacy loan-ish fields on borrower; keep them neutral.
    const today = new Date().toISOString().split("T")[0];

    const { data: borrower, error } = await supabase
      .from("borrowers")
      .insert({
        name: borrowerForm.name.trim(),
        contact_number: borrowerForm.contact_number.trim() || null,
        notes: borrowerForm.notes.trim() || null,
        // legacy-required fields (neutral values)
        principal_amount: 0,
        interest_type: "zero_interest",
        interest_rate: 0,
        loan_start_date: today,
        teacher_id: teacherId,
      } as any)
      .select()
      .single();

    if (error) throw error;

    if (selectedImage && borrower) {
      const fileExt = selectedImage.name.split(".").pop();
      const filePath = `${borrower.id}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("borrower-photos")
        .upload(filePath, selectedImage, { upsert: true });

      if (!uploadError) {
        const { data: signedUrlData } = await supabase.storage.from("borrower-photos").createSignedUrl(filePath, 31536000);
        await supabase
          .from("borrowers")
          .update({ profile_photo_url: signedUrlData?.signedUrl || null } as any)
          .eq("id", borrower.id);
        borrower.profile_photo_url = signedUrlData?.signedUrl || null;
      }
    }

    return borrower as Borrower;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!loanForm.principal_amount || Number(loanForm.principal_amount) <= 0) {
      toast({ title: "Error", description: "Please enter a valid principal amount", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const borrower = await createBorrowerIfNeeded();

      const { data: auth } = await supabase.auth.getUser();
      const teacherId = auth.user?.id ?? null;

      // Auto-settle previous active loan (your selected rule)
      const { data: activeLoans } = await supabase
        .from("loans")
        .select("*")
        .eq("borrower_id", borrower.id)
        .eq("status", "active")
        .order("start_date", { ascending: false })
        .limit(1);

      const activeLoan = (activeLoans?.[0] as Loan | undefined) ?? undefined;
      if (activeLoan) {
        await supabase
          .from("loans")
          .update({ status: "settled", settled_at: loanForm.start_date } as any)
          .eq("id", activeLoan.id);
      }

      const { data: newLoan, error: loanError } = await supabase
        .from("loans")
        .insert({
          borrower_id: borrower.id,
          principal_amount: Number(loanForm.principal_amount),
          interest_type: loanForm.interest_type,
          interest_rate: loanForm.interest_type === "zero_interest" ? 0 : Number(loanForm.interest_rate || 0),
          start_date: loanForm.start_date,
          status: "active",
          teacher_id: teacherId,
        } as any)
        .select()
        .single();

      if (loanError) throw loanError;

      const { error: ledgerError } = await supabase.from("lending_ledger").insert({
        borrower_id: borrower.id,
        loan_id: (newLoan as any).id,
        entry_type: "PRINCIPAL",
        amount: Number(loanForm.principal_amount),
        entry_date: loanForm.start_date,
        description: "Loan given",
        teacher_id: teacherId,
      } as any);

      if (ledgerError) throw ledgerError;

      toast({ title: "Success", description: "Loan added successfully" });
      setOpen(false);
      onCompleted();
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
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Loan</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2">
          <Button type="button" variant={mode === "existing" ? "default" : "outline"} onClick={() => setMode("existing")}>
            Existing Borrower
          </Button>
          <Button type="button" variant={mode === "new" ? "default" : "outline"} onClick={() => setMode("new")}>
            New Borrower
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {mode === "existing" ? (
            <div className="space-y-2">
              <Label>Borrower *</Label>
              <Select value={selectedBorrowerId} onValueChange={setSelectedBorrowerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select borrower" />
                </SelectTrigger>
                <SelectContent>
                  {selectableBorrowers.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                      {b.contact_number ? ` • ${b.contact_number}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Profile Photo (optional)</Label>
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={imagePreview || undefined} />
                    <AvatarFallback className="text-lg">{borrowerForm.name ? borrowerForm.name.charAt(0).toUpperCase() : "?"}</AvatarFallback>
                  </Avatar>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload
                    </Button>
                    {imagePreview && (
                      <Button type="button" variant="ghost" size="sm" onClick={clearImage}>
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="borrower_name">Full Name *</Label>
                <Input
                  id="borrower_name"
                  value={borrowerForm.name}
                  onChange={(e) => setBorrowerForm({ ...borrowerForm, name: e.target.value })}
                  placeholder="Enter borrower name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="borrower_phone">Contact Number</Label>
                <Input
                  id="borrower_phone"
                  value={borrowerForm.contact_number}
                  onChange={(e) => setBorrowerForm({ ...borrowerForm, contact_number: e.target.value })}
                  placeholder="Enter contact number"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="borrower_notes">Notes</Label>
                <Textarea
                  id="borrower_notes"
                  value={borrowerForm.notes}
                  onChange={(e) => setBorrowerForm({ ...borrowerForm, notes: e.target.value })}
                  placeholder="Any additional notes..."
                  rows={2}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="principal">Principal Amount (₹) *</Label>
              <Input
                id="principal"
                type="number"
                min="1"
                value={loanForm.principal_amount}
                onChange={(e) => setLoanForm({ ...loanForm, principal_amount: e.target.value })}
                placeholder="Enter amount"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date *</Label>
              <Input
                id="start_date"
                type="date"
                value={loanForm.start_date}
                onChange={(e) => setLoanForm({ ...loanForm, start_date: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Interest Type</Label>
            <Select value={loanForm.interest_type} onValueChange={(v: InterestType) => setLoanForm({ ...loanForm, interest_type: v })}>
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

          {loanForm.interest_type !== "zero_interest" && (
            <div className="space-y-2">
              <Label htmlFor="rate">Interest Rate (% per annum)</Label>
              <Input
                id="rate"
                type="number"
                min="0"
                step="0.1"
                value={loanForm.interest_rate}
                onChange={(e) => setLoanForm({ ...loanForm, interest_rate: e.target.value })}
                placeholder="Enter annual rate"
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Add Loan"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
