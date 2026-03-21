import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { RoutineDayCard } from "@/components/routine/RoutineDayCard";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

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

const getTodayName = () => {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return days[new Date().getDay()];
};

const Routine = () => {
  const { toast } = useToast();
  const [routines, setRoutines] = useState<RoutineSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const todayName = getTodayName();

  const fetchRoutines = async () => {
    try {
      const { data, error } = await supabase
        .from("routines")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) {
        toast({ title: "Error", description: "Failed to fetch routines", variant: "destructive" });
      } else {
        setRoutines(data || []);
      }
    } catch {
      toast({ title: "Error", description: "Something went wrong", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoutines();
  }, []);

  // Scroll to today's card on load
  useEffect(() => {
    if (!loading && scrollRef.current) {
      const todayIndex = DAYS_OF_WEEK.indexOf(todayName);
      if (todayIndex >= 0) {
        const cards = scrollRef.current.querySelectorAll("[data-day-card]");
        if (cards[todayIndex]) {
          cards[todayIndex].scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
        }
      }
    }
  }, [loading, todayName]);

  const groupedRoutines = DAYS_OF_WEEK.map((day) => ({
    day,
    slots: routines.filter((r) => r.day_of_week === day),
  }));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <main className="max-w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h2 className="text-2xl font-bold tracking-tight">Weekly Routine</h2>
          <p className="text-muted-foreground">Manage your tuition schedule</p>
        </motion.div>

        {/* Horizontal scrolling container */}
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scroll-smooth scrollbar-hide"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {groupedRoutines.map(({ day, slots }, index) => (
            <motion.div
              key={day}
              data-day-card
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="snap-center flex-shrink-0"
            >
              <RoutineDayCard
                day={day}
                slots={slots}
                isToday={day === todayName}
                onUpdate={fetchRoutines}
              />
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Routine;
