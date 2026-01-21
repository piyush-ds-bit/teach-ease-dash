import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Edit, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { studentSchema } from "@/lib/validation";

type Student = {
  id: string;
  name: string;
  class: string;
  contact_number: string;
  monthly_fee: number;
  joining_date: string;
  subject: string | null;
  remarks: string;
  profile_photo_url: string | null;
};

type EditStudentDialogProps = {
  student: Student;
  onUpdate: () => void;
};

export const EditStudentDialog = ({ student, onUpdate }: EditStudentDialogProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>(student.profile_photo_url || "");
  const [removeExistingPhoto, setRemoveExistingPhoto] = useState(false);
  const [formData, setFormData] = useState({
    name: student.name,
    class: student.class,
    contact_number: student.contact_number,
    monthly_fee: student.monthly_fee.toString(),
    joining_date: student.joining_date,
    subject: student.subject || "",
    remarks: student.remarks || "",
  });

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Please upload a JPG, PNG, or WEBP image",
          variant: "destructive",
        });
        return;
      }
      
      // Validate file size (5MB)
      if (file.size > 5242880) {
        toast({
          title: "File too large",
          description: "Image must be less than 5MB",
          variant: "destructive",
        });
        return;
      }
      
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setRemoveExistingPhoto(false);
    }
  };

  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview("");
    setRemoveExistingPhoto(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate form data
      const validationResult = studentSchema.safeParse({
        name: formData.name,
        class: formData.class,
        contact_number: formData.contact_number,
        monthly_fee: Number(formData.monthly_fee),
        joining_date: formData.joining_date,
        remarks: formData.remarks || undefined,
      });

      if (!validationResult.success) {
        const errors = validationResult.error.errors.map(e => e.message).join(", ");
        throw new Error(errors);
      }

      let photoUrl = student.profile_photo_url;

      // Handle photo removal
      if (removeExistingPhoto && student.profile_photo_url) {
        const oldFileName = student.profile_photo_url.split('/').pop();
        if (oldFileName) {
          await supabase.storage.from('student-photos').remove([oldFileName]);
        }
        photoUrl = null;
      }

      // Handle new photo upload
      if (photoFile) {
        // Delete old photo if exists
        if (student.profile_photo_url) {
          // Extract file path from signed URL or direct path
          const urlParts = student.profile_photo_url.split('/student-photos/');
          if (urlParts[1]) {
            const oldFileName = urlParts[1].split('?')[0]; // Remove query params
            await supabase.storage.from('student-photos').remove([oldFileName]);
          }
        }

        // Upload new photo
        const fileExt = photoFile.name.split('.').pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('student-photos')
          .upload(fileName, photoFile);
        
        if (uploadError) throw uploadError;
        
        // Use signed URL for private bucket (1 year expiry)
        const { data: signedUrlData } = await supabase.storage
          .from('student-photos')
          .createSignedUrl(fileName, 31536000);
        
        photoUrl = signedUrlData?.signedUrl || null;
      }

      const { error } = await supabase
        .from("students")
        .update({
          name: validationResult.data.name,
          class: validationResult.data.class,
          contact_number: validationResult.data.contact_number,
          monthly_fee: validationResult.data.monthly_fee,
          joining_date: validationResult.data.joining_date,
          subject: formData.subject || null,
          remarks: validationResult.data.remarks || null,
          profile_photo_url: photoUrl,
        })
        .eq("id", student.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Student updated successfully",
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
          <Button variant="outline">
            <Edit className="h-4 w-4 mr-2" />
            Edit Details
          </Button>
        </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Student Details</DialogTitle>
          <DialogDescription>
            Update the student information below
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
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                placeholder="e.g., Mathematics, Science, English"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="photo">Profile Photo (Optional)</Label>
              <Input
                id="photo"
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                onChange={handlePhotoChange}
              />
              {photoPreview && !removeExistingPhoto && (
                <div className="relative mt-2 inline-block">
                  <img 
                    src={photoPreview} 
                    alt="Current photo" 
                    className="w-24 h-24 rounded-full object-cover border-2 border-border"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                    onClick={removePhoto}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="remarks">Remarks (Optional)</Label>
              <Textarea
                id="remarks"
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? "Updating..." : "Update Student"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
      </Dialog>
  );
};
