import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AddHomeworkDialog } from "./AddHomeworkDialog";
import { EditHomeworkDialog } from "./EditHomeworkDialog";
import { DeleteHomeworkDialog } from "./DeleteHomeworkDialog";
import { BookOpen, Calendar } from "lucide-react";
import { format, parseISO, isToday, isPast } from "date-fns";

interface Homework {
  id: string;
  title: string;
  description: string;
  due_date: string;
  completed: boolean;
  created_at: string;
}

interface HomeworkListProps {
  studentId: string;
}

export const HomeworkList = ({ studentId }: HomeworkListProps) => {
  const [homework, setHomework] = useState<Homework[]>([]);
  const [loading, setLoading] = useState(true);

  const loadHomework = async () => {
    try {
      const { data, error } = await supabase
        .from("homework")
        .select("*")
        .eq("student_id", studentId)
        .order("due_date", { ascending: true });

      if (error) throw error;
      if (data) setHomework(data);
    } catch (error) {
      console.error("Error loading homework:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHomework();
  }, [studentId]);

  const getHomeworkStatus = (hw: Homework) => {
    if (hw.completed) return { label: "Completed", variant: "default" as const };
    
    const dueDate = parseISO(hw.due_date);
    if (isPast(dueDate) && !isToday(dueDate)) {
      return { label: "Overdue", variant: "destructive" as const };
    }
    if (isToday(dueDate)) {
      return { label: "Due Today", variant: "default" as const };
    }
    return { label: "Upcoming", variant: "outline" as const };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Homework Assignments</h3>
        <AddHomeworkDialog studentId={studentId} onHomeworkAdded={loadHomework} />
      </div>

      {homework.length > 0 ? (
        <div className="space-y-3">
          {homework.map((hw) => {
            const status = getHomeworkStatus(hw);
            const dueDate = parseISO(hw.due_date);

            return (
              <Card key={hw.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{hw.title}</h4>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{hw.description}</p>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        Due: {format(dueDate, "MMM d, yyyy")}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <EditHomeworkDialog homework={hw} onHomeworkUpdated={loadHomework} />
                      <DeleteHomeworkDialog
                        homeworkId={hw.id}
                        homeworkTitle={hw.title}
                        onHomeworkDeleted={loadHomework}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No homework assigned yet</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
