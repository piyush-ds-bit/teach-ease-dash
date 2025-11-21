import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface DeleteHomeworkDialogProps {
  homeworkId: string;
  homeworkTitle: string;
  onHomeworkDeleted: () => void;
}

export const DeleteHomeworkDialog = ({
  homeworkId,
  homeworkTitle,
  onHomeworkDeleted,
}: DeleteHomeworkDialogProps) => {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);

    try {
      const { error } = await supabase.from("homework").delete().eq("id", homeworkId);

      if (error) throw error;

      toast({
        title: "Homework deleted",
        description: "The homework has been removed successfully.",
      });

      onHomeworkDeleted();
    } catch (error) {
      console.error("Error deleting homework:", error);
      toast({
        title: "Error",
        description: "Failed to delete homework. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Homework?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete "{homeworkTitle}"? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
