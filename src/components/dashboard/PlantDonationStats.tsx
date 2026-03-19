import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TreePine, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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
    <Card className="shadow-card hover:shadow-hover transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Total Plants Donated
        </CardTitle>
        <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
          <TreePine className="h-4 w-4 text-green-600 dark:text-green-400" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{total}</div>
      </CardContent>
    </Card>
  );
};
