import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getStudentSession } from "@/lib/studentAuth";
import { StudentHeader } from "@/components/student/StudentHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Calendar, CheckCircle2 } from "lucide-react";
import { format, parseISO, isToday, isPast } from "date-fns";

interface Homework {
  id: string;
  title: string;
  description: string;
  due_date: string;
  completed: boolean;
  created_at: string;
}

const StudentHomework = () => {
  const session = getStudentSession();
  const [homework, setHomework] = useState<Homework[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session) {
      loadHomework();
    }
  }, [session]);

  const loadHomework = async () => {
    if (!session) return;

    try {
      const { data, error } = await supabase
        .from("homework")
        .select("*")
        .eq("student_id", session.studentId)
        .order("due_date", { ascending: true });

      if (error) throw error;
      if (data) setHomework(data);
    } catch (error) {
      console.error("Error loading homework:", error);
    } finally {
      setLoading(false);
    }
  };

  const pendingHomework = homework.filter((hw) => !hw.completed);
  const completedHomework = homework.filter((hw) => hw.completed);

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

  const HomeworkCard = ({ hw }: { hw: Homework }) => {
    const status = getHomeworkStatus(hw);
    const dueDate = parseISO(hw.due_date);

    return (
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <CardTitle className="text-lg">{hw.title}</CardTitle>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
          <CardDescription className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Due: {format(dueDate, "MMMM d, yyyy")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{hw.description}</p>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <StudentHeader />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <StudentHeader />
      <main className="container py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Homework</h1>
          <p className="text-muted-foreground">Track your assignments and deadlines</p>
        </div>

        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList>
            <TabsTrigger value="pending" className="gap-2">
              <BookOpen className="h-4 w-4" />
              Pending ({pendingHomework.length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Completed ({completedHomework.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            {pendingHomework.length > 0 ? (
              pendingHomework.map((hw) => <HomeworkCard key={hw.id} hw={hw} />)
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No pending homework</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            {completedHomework.length > 0 ? (
              completedHomework.map((hw) => <HomeworkCard key={hw.id} hw={hw} />)
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <CheckCircle2 className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No completed homework yet</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default StudentHomework;
