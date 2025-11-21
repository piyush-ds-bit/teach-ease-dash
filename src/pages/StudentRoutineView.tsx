import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { StudentHeader } from "@/components/student/StudentHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock } from "lucide-react";
import { format } from "date-fns";

interface Routine {
  id: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  notes: string | null;
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const StudentRoutineView = () => {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRoutines();
  }, []);

  const loadRoutines = async () => {
    try {
      const { data, error } = await supabase
        .from("routines")
        .select("*")
        .order("start_time", { ascending: true });

      if (error) throw error;
      if (data) setRoutines(data);
    } catch (error) {
      console.error("Error loading routines:", error);
    } finally {
      setLoading(false);
    }
  };

  const getRoutinesForDay = (day: string) => {
    return routines.filter((r) => r.day_of_week === day);
  };

  const today = format(new Date(), "EEEE");

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
          <h1 className="text-3xl font-bold mb-2">Weekly Routine</h1>
          <p className="text-muted-foreground">Your complete class schedule</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {DAYS.map((day) => {
            const dayRoutines = getRoutinesForDay(day);
            const isToday = day === today;

            return (
              <Card key={day} className={isToday ? "ring-2 ring-primary" : ""}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between">
                    {day}
                    {isToday && (
                      <span className="text-xs font-normal text-primary">Today</span>
                    )}
                  </CardTitle>
                  <CardDescription>
                    {dayRoutines.length} {dayRoutines.length === 1 ? "class" : "classes"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {dayRoutines.length > 0 ? (
                    <div className="space-y-2">
                      {dayRoutines.map((routine) => (
                        <div
                          key={routine.id}
                          className="p-3 rounded-lg bg-muted space-y-1"
                        >
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <p className="font-medium text-sm">
                              {routine.start_time} - {routine.end_time}
                            </p>
                          </div>
                          {routine.notes && (
                            <p className="text-xs text-muted-foreground pl-6">
                              {routine.notes}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No classes scheduled
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default StudentRoutineView;
