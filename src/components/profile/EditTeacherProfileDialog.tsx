import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { compressImage } from "@/lib/imageCompression";
import { Trash2, Upload } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacherId: string;
  userId: string;
  fullName: string;
  email: string;
  currentPhotoPath: string | null;
  currentPhotoUrl: string | null;
  initials: string;
  onSaved: () => void;
};

const ALLOWED = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

export const EditTeacherProfileDialog = ({
  open,
  onOpenChange,
  teacherId,
  userId,
  fullName,
  email,
  currentPhotoPath,
  currentPhotoUrl,
  initials,
  onSaved,
}: Props) => {
  const { toast } = useToast();
  const [name, setName] = useState(fullName);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentPhotoUrl);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && !loading) {
      setName(fullName);
      setPhotoFile(null);
      setPreviewUrl(currentPhotoUrl);
      setRemovePhoto(false);
    }
    onOpenChange(nextOpen);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED.includes(file.type)) {
      toast({ title: "Invalid file", description: "Use JPG, PNG, or WEBP", variant: "destructive" });
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast({ title: "Too large", description: "Max 8MB", variant: "destructive" });
      return;
    }
    setPhotoFile(file);
    setRemovePhoto(false);
    const reader = new FileReader();
    reader.onload = () => setPreviewUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleRemove = () => {
    setPhotoFile(null);
    setPreviewUrl(null);
    setRemovePhoto(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ title: "Name required", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      let newPath: string | null = currentPhotoPath;

      if (removePhoto && currentPhotoPath) {
        const { error: removeErr } = await supabase.storage.from("teacher-profiles").remove([currentPhotoPath]);
        if (removeErr) throw removeErr;
        newPath = null;
      }

      if (photoFile) {
        // Delete prior file
        if (currentPhotoPath) {
          const { error: removeErr } = await supabase.storage.from("teacher-profiles").remove([currentPhotoPath]);
          if (removeErr) throw removeErr;
        }
        const compressed = await compressImage(photoFile, 512, 0.85);
        const ext = compressed.type === "image/png" ? "png" : "jpg";
        const path = `${userId}/avatar-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("teacher-profiles")
          .upload(path, compressed, { contentType: compressed.type, upsert: true });
        if (upErr) throw upErr;
        newPath = path;
      }

      const { error: updErr } = await supabase
        .from("teachers")
        .update({ full_name: name.trim(), profile_photo_url: newPath } as any)
        .eq("id", teacherId);
      if (updErr) throw updErr;

      toast({ title: "Profile updated" });
      onSaved();
      handleOpenChange(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[460px] max-h-[90dvh] flex flex-col p-0 gap-0">
        <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle>Profile Settings</DialogTitle>
            <DialogDescription>Update your teacher profile details</DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5 overscroll-contain">
            <div className="flex flex-col items-center gap-3">
              <Avatar className="h-24 w-24 ring-2 ring-border">
                {previewUrl ? <AvatarImage src={previewUrl} alt={name} /> : null}
                <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex gap-2">
                <Label
                  htmlFor="teacher-photo"
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-md border bg-background hover:bg-accent cursor-pointer"
                >
                  <Upload className="h-4 w-4" /> Upload
                </Label>
                <Input
                  id="teacher-photo"
                  type="file"
                  className="hidden"
                  accept=".jpg,.jpeg,.png,.webp"
                  onChange={handlePhotoChange}
                />
                {(previewUrl || currentPhotoPath) && (
                  <Button type="button" variant="ghost" size="sm" onClick={handleRemove}>
                    <Trash2 className="h-4 w-4 mr-1" /> Remove
                  </Button>
                )}
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="t-name">Full Name</Label>
              <Input id="t-name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="grid gap-2">
              <Label>Email</Label>
              <Input value={email} disabled />
            </div>
          </div>

          <DialogFooter className="sticky bottom-0 bg-background border-t px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] flex-row gap-2 sm:gap-2">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} className="flex-1 sm:flex-none">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1 sm:flex-none">
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
