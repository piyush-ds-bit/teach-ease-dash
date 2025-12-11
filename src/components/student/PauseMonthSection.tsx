import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PauseCircle, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { formatPausedMonth } from "@/lib/dueCalculation";

interface PauseMonthSectionProps {
  studentId: string;
  pausedMonths: string[];
  onUpdate: () => void;
}

export const PauseMonthSection = ({ studentId, pausedMonths, onUpdate }: PauseMonthSectionProps) => {
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [loading, setLoading] = useState(false);

  const months = [
    { value: "01", label: "January" },
    { value: "02", label: "February" },
    { value: "03", label: "March" },
    { value: "04", label: "April" },
    { value: "05", label: "May" },
    { value: "06", label: "June" },
    { value: "07", label: "July" },
    { value: "08", label: "August" },
    { value: "09", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => (currentYear - 2 + i).toString());

  const handlePauseMonth = async () => {
    if (!selectedMonth || !selectedYear) {
      toast.error("Please select both month and year");
      return;
    }

    const monthKey = `${selectedYear}-${selectedMonth}`;

    if (pausedMonths.includes(monthKey)) {
      toast.error("This month is already paused");
      return;
    }

    setLoading(true);
    try {
      const newPausedMonths = [...pausedMonths, monthKey];
      
      const { error } = await supabase
        .from("students")
        .update({ paused_months: newPausedMonths })
        .eq("id", studentId);

      if (error) throw error;

      toast.success(`${formatPausedMonth(monthKey)} has been paused`);
      onUpdate();
      setSelectedMonth("");
    } catch (error) {
      console.error("Error pausing month:", error);
      toast.error("Failed to pause month");
    } finally {
      setLoading(false);
    }
  };

  const handleUnpauseMonth = async (monthKey: string) => {
    setLoading(true);
    try {
      const newPausedMonths = pausedMonths.filter(m => m !== monthKey);
      
      const { error } = await supabase
        .from("students")
        .update({ paused_months: newPausedMonths })
        .eq("id", studentId);

      if (error) throw error;

      toast.success(`${formatPausedMonth(monthKey)} has been unpaused`);
      onUpdate();
    } catch (error) {
      console.error("Error unpausing month:", error);
      toast.error("Failed to unpause month");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PauseCircle className="h-5 w-5 text-warning" />
          Pause Monthly Fee
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="space-y-1">
            <label className="text-sm text-muted-foreground">Month</label>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Select month" />
              </SelectTrigger>
              <SelectContent>
                {months.map((month) => (
                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-sm text-muted-foreground">Year</label>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={year}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handlePauseMonth} disabled={loading || !selectedMonth}>
            <PauseCircle className="h-4 w-4 mr-2" />
            Pause Selected Month
          </Button>
        </div>

        {pausedMonths.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Paused Months:</p>
            <div className="flex flex-wrap gap-2">
              {pausedMonths.sort().map((monthKey) => (
                <Badge
                  key={monthKey}
                  variant="secondary"
                  className="flex items-center gap-2 py-1.5 px-3"
                >
                  <span>{formatPausedMonth(monthKey)}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 hover:bg-destructive/20"
                    onClick={() => handleUnpauseMonth(monthKey)}
                    disabled={loading}
                  >
                    <Undo2 className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {pausedMonths.length === 0 && (
          <p className="text-sm text-muted-foreground italic">No months are currently paused</p>
        )}
      </CardContent>
    </Card>
  );
};
