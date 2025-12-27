import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { AddRoutineDialog } from "@/components/routine/AddRoutineDialog";
import { RoutineCard } from "@/components/routine/RoutineCard";
import { useToast } from "@/hooks/use-toast";

type RoutineSlot = {
  id: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  notes: string | null;
  created_at: string;
};

const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const Routine = () => {
  const { toast } = useToast();
  const [routines, setRoutines] = useState<RoutineSlot[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchRoutines = async () => {
    const { data, error } = await supabase
      .from("routines")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch routines",
        variant: "destructive",
      });
    } else {
      setRoutines(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRoutines();
  }, []);

  const groupedRoutines = DAYS_OF_WEEK.map((day) => ({
    day,
    slots: routines.filter((r) => r.day_of_week === day),
  }));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Weekly Routine</h2>
            <p className="text-muted-foreground">Manage your tuition timings for the week</p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Routine Slot
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groupedRoutines.map(({ day, slots }) => (
            <RoutineCard key={day} day={day} slots={slots} onUpdate={fetchRoutines} />
          ))}
        </div>
      </main>

      <AddRoutineDialog 
        open={dialogOpen} 
        onOpenChange={setDialogOpen} 
        onSuccess={fetchRoutines} 
      />
    </div>
  );
};

export default Routine;
