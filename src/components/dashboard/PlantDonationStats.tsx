import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TreePine, Loader2 } from "lucide-react";
import { motion, useInView } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

function AnimatedCounter({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView || value === 0) {
      setDisplay(value);
      return;
    }
    let start = 0;
    const duration = 800;
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      start = Math.round(eased * value);
      setDisplay(start);
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [inView, value]);

  return <div ref={ref} className="text-2xl font-bold">{display}</div>;
}

export const PlantDonationStats = () => {
  const [total, setTotal] = useState<number | null>(null);

  useEffect(() => {
    supabase
      .from("plant_donations")
      .select("id", { count: "exact", head: true })
      .then(({ count }) => setTotal(count ?? 0));
  }, []);

  if (total === null) {
    return (
      <Card className="shadow-card">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      <Card className="shadow-card hover:shadow-hover transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Plants Donated
          </CardTitle>
          <motion.div
            className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.2 }}
          >
            <TreePine className="h-4 w-4 text-green-600 dark:text-green-400" />
          </motion.div>
        </CardHeader>
        <CardContent>
          <AnimatedCounter value={total} />
        </CardContent>
      </Card>
    </motion.div>
  );
};
