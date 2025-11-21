import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Pencil, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Homework {
  id: string;
  title: string;
  description: string;
  due_date: string;
  completed: boolean;
}

interface EditHomeworkDialogProps {
  homework: Homework;
  onHomeworkUpdated: () => void;
}

export const EditHomeworkDialog = ({ homework, onHomeworkUpdated }: EditHomeworkDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: homework.title,
    description: homework.description,
    due_date: homework.due_date,
    completed: homework.completed,
  });

  useEffect(() => {
    setFormData({
      title: homework.title,
      description: homework.description,
      due_date: homework.due_date,
      completed: homework.completed,
    });
  }, [homework]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from("homework")
        .update({
          title: formData.title,
          description: formData.description,
          due_date: formData.due_date,
          completed: formData.completed,
        })
        .eq("id", homework.id);

      if (error) throw error;

      toast({
        title: "Homework updated",
        description: "The homework has been updated successfully.",
      });

      setOpen(false);
      onHomeworkUpdated();
    } catch (error) {
      console.error("Error updating homework:", error);
      toast({
        title: "Error",
        description: "Failed to update homework. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Homework</DialogTitle>
          <DialogDescription>Update homework details</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
              disabled={loading}
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="due_date">Due Date</Label>
            <Input
              id="due_date"
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              required
              disabled={loading}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="completed"
              checked={formData.completed}
              onChange={(e) => setFormData({ ...formData, completed: e.target.checked })}
              disabled={loading}
              className="h-4 w-4"
            />
            <Label htmlFor="completed" className="cursor-pointer">
              Mark as completed
            </Label>
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
