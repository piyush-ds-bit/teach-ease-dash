import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Upload, X } from "lucide-react";
import { BorrowerPerson } from "@/lib/lendingCalculation";

interface EditBorrowerDialogProps {
  borrower: BorrowerPerson | null;
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
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    contact_number: "",
    notes: "",
  });

  useEffect(() => {
    if (borrower) {
      setFormData({
        name: borrower.name,
        contact_number: borrower.contact_number || "",
        notes: borrower.notes || "",
      });
      setImagePreview(borrower.profile_photo_url || null);
      setSelectedImage(null);
    }
  }, [borrower]);

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
      let photoUrl = borrower.profile_photo_url;

      // Upload new photo if selected
      if (selectedImage) {
        const fileExt = selectedImage.name.split('.').pop();
        const filePath = `${borrower.id}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('borrower-photos')
          .upload(filePath, selectedImage, { upsert: true });

        if (!uploadError) {
          const { data: signedUrlData } = await supabase.storage
            .from('borrower-photos')
            .createSignedUrl(filePath, 31536000);
          photoUrl = signedUrlData?.signedUrl || null;
        }
      } else if (imagePreview === null && borrower.profile_photo_url) {
        photoUrl = null;
      }

      const { error } = await supabase
        .from('borrowers')
        .update({
          name: formData.name.trim(),
          contact_number: formData.contact_number.trim() || null,
          notes: formData.notes.trim() || null,
          profile_photo_url: photoUrl,
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
                  {imagePreview ? "Change" : "Upload"}
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
