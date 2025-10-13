import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const AddStudentDialog = () => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    class: "",
    contact_number: "",
    monthly_fee: "",
    joining_date: "",
    remarks: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.from("students").insert({
        name: formData.name,
        class: formData.class,
        contact_number: formData.contact_number,
        monthly_fee: Number(formData.monthly_fee),
        joining_date: formData.joining_date,
        remarks: formData.remarks || null,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Student added successfully",
      });

      setOpen(false);
      setFormData({
        name: "",
        class: "",
        contact_number: "",
        monthly_fee: "",
        joining_date: "",
        remarks: "",
      });
      
      window.location.reload();
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
          Add Student
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Student</DialogTitle>
          <DialogDescription>
            Enter the student details below to add them to your tuition.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="class">Class *</Label>
              <Input
                id="class"
                placeholder="e.g., 10th, 12th"
                value={formData.class}
                onChange={(e) => setFormData({ ...formData, class: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="contact">Contact Number *</Label>
              <Input
                id="contact"
                type="tel"
                value={formData.contact_number}
                onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="fee">Monthly Fee (₹) *</Label>
              <Input
                id="fee"
                type="number"
                min="0"
                value={formData.monthly_fee}
                onChange={(e) => setFormData({ ...formData, monthly_fee: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="joining">Joining Date *</Label>
              <Input
                id="joining"
                type="date"
                value={formData.joining_date}
                onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="remarks">Remarks (Optional)</Label>
              <Textarea
                id="remarks"
                placeholder="Any additional notes about the student"
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add Student"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
