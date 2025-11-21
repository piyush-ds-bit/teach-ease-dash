import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";

interface CredentialsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loginId: string;
  password: string;
  studentName: string;
}

export const CredentialsDialog = ({
  open,
  onOpenChange,
  loginId,
  password,
  studentName,
}: CredentialsDialogProps) => {
  const [copied, setCopied] = useState(false);

  const copyCredentials = () => {
    const text = `Student ID: ${loginId}\nPassword: ${password}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast({
      title: "Copied to clipboard",
      description: "Student credentials have been copied.",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Student Credentials Created</DialogTitle>
          <DialogDescription>
            Save these credentials for {studentName}. They won't be shown again.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg bg-muted p-4 space-y-3">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Student ID</p>
              <p className="text-lg font-mono font-semibold">{loginId}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Password</p>
              <p className="text-lg font-mono font-semibold">{password}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={copyCredentials} className="flex-1">
              {copied ? (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Credentials
                </>
              )}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Make sure to save these credentials securely. The student will need them to log in.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
