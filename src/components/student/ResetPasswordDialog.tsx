import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { KeyRound, Loader2, Copy, CheckCircle2 } from "lucide-react";
import { generateRandomPassword, resetStudentPassword } from "@/lib/studentAuth";
import { toast } from "@/hooks/use-toast";

interface ResetPasswordDialogProps {
  studentId: string;
  studentName: string;
}

export const ResetPasswordDialog = ({ studentId, studentName }: ResetPasswordDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newPassword, setNewPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleResetPassword = async () => {
    setLoading(true);

    try {
      const password = generateRandomPassword();
      
      // Use edge function for secure bcrypt hashing
      const result = await resetStudentPassword(studentId, password);

      if (!result.success) {
        throw new Error(result.error || "Failed to reset password");
      }

      setNewPassword(password);
      toast({
        title: "Password reset",
        description: "A new password has been generated for the student.",
      });
    } catch (error: any) {
      console.error("Error resetting password:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to reset password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyPassword = () => {
    if (newPassword) {
      navigator.clipboard.writeText(newPassword);
      setCopied(true);
      toast({
        title: "Copied to clipboard",
        description: "New password has been copied.",
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setNewPassword(null);
    setCopied(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <KeyRound className="h-4 w-4 mr-2" />
          Reset Password
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reset Password</DialogTitle>
          <DialogDescription>
            Generate a new password for {studentName}
          </DialogDescription>
        </DialogHeader>
        
        {!newPassword ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This will generate a new password and invalidate the old one. Make sure to share the
              new password with the student.
            </p>
            <Button onClick={handleResetPassword} disabled={loading} className="w-full">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Generate New Password
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm text-muted-foreground mb-2">New Password</p>
              <p className="text-lg font-mono font-semibold">{newPassword}</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={copyPassword} className="flex-1">
                {copied ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Password
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={handleClose}>
                Done
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Make sure to save this password and share it with the student. It won't be shown again.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};