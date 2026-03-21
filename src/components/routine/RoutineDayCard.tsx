import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil, Trash2, Plus, Clock, X, Check } from "lucide-react";
import { EditRoutineDialog } from "./EditRoutineDialog";
import { DeleteRoutineDialog } from "./DeleteRoutineDialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

type RoutineSlot = {
  id: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  notes: string | null;
  created_at: string;
};

type RoutineDayCardProps = {
  day: string;
  slots: RoutineSlot[];
  isToday: boolean;
  onUpdate: () => void;
};

const formatTime = (time: string) => {
  const [h, m] = time.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${m} ${ampm}`;
};

const DAY_EMOJI: Record<string, string> = {
  Monday: "🌙",
  Tuesday: "🔥",
  Wednesday: "💧",
  Thursday: "⚡",
  Friday: "🌿",
  Saturday: "💎",
  Sunday: "☀️",
};

export const RoutineDayCard = ({ day, slots, isToday, onUpdate }: RoutineDayCardProps) => {
  const { toast } = useToast();
  const [editingSlot, setEditingSlot] = useState<RoutineSlot | null>(null);
  const [deletingSlot, setDeletingSlot] = useState<RoutineSlot | null>(null);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newSlot, setNewSlot] = useState({ start_time: "", end_time: "", notes: "" });

  const handleAddSlot = async () => {
    if (!newSlot.start_time || !newSlot.end_time) {
      toast({ title: "Error", description: "Please set start and end times", variant: "destructive" });
      return;
    }
    const start = new Date(`2000-01-01 ${newSlot.start_time}`);
    const end = new Date(`2000-01-01 ${newSlot.end_time}`);
    if (start >= end) {
      toast({ title: "Error", description: "Start time must be before end time", variant: "destructive" });
      return;
    }

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "Error", description: "Not authenticated", variant: "destructive" });
      setSaving(false);
      return;
    }

    const { error } = await supabase.from("routines").insert({
      day_of_week: day,
      start_time: newSlot.start_time,
      end_time: newSlot.end_time,
      notes: newSlot.notes || null,
      teacher_id: user.id,
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Added", description: `Slot added for ${day}` });
      setNewSlot({ start_time: "", end_time: "", notes: "" });
      setAdding(false);
      onUpdate();
    }
    setSaving(false);
  };

  return (
    <>
      <div
        className={cn(
          "w-[280px] sm:w-[300px] rounded-2xl p-5 transition-all duration-300",
          "border backdrop-blur-xl",
          "bg-card/40 dark:bg-card/20",
          "border-border/40 dark:border-border/30",
          "shadow-card",
          isToday && [
            "ring-2 ring-primary/50",
            "scale-[1.03]",
            "shadow-hover",
            "border-primary/30",
          ]
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">{DAY_EMOJI[day] || "📅"}</span>
            <div>
              <h3 className={cn("font-semibold text-base", isToday && "text-primary")}>
                {day}
              </h3>
              {isToday && (
                <span className="text-[10px] uppercase tracking-wider font-bold text-primary">
                  Today
                </span>
              )}
            </div>
          </div>
          <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
            {slots.length} {slots.length === 1 ? "class" : "classes"}
          </span>
        </div>

        {/* Slots */}
        <div className="space-y-2 min-h-[60px]">
          {slots.length === 0 && !adding && (
            <p className="text-sm text-muted-foreground italic text-center py-4">
              No classes scheduled
            </p>
          )}

          <AnimatePresence>
            {slots.map((slot) => (
              <motion.div
                key={slot.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={cn(
                  "group p-3 rounded-xl transition-colors",
                  "bg-background/60 dark:bg-background/20",
                  "border border-border/30",
                  "hover:bg-accent/10"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                      <p className="font-medium text-sm">
                        {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
                      </p>
                    </div>
                    {slot.notes && (
                      <p className="text-xs text-muted-foreground mt-1 ml-5 truncate">
                        {slot.notes}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => setEditingSlot(slot)}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      onClick={() => setDeletingSlot(slot)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Inline Add Form */}
          <AnimatePresence>
            {adding && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[10px] uppercase text-muted-foreground">Start</Label>
                      <Input
                        type="time"
                        value={newSlot.start_time}
                        onChange={(e) => setNewSlot({ ...newSlot, start_time: e.target.value })}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] uppercase text-muted-foreground">End</Label>
                      <Input
                        type="time"
                        value={newSlot.end_time}
                        onChange={(e) => setNewSlot({ ...newSlot, end_time: e.target.value })}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                  <Input
                    placeholder="Notes (optional)"
                    value={newSlot.notes}
                    onChange={(e) => setNewSlot({ ...newSlot, notes: e.target.value })}
                    className="h-8 text-sm"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 h-8"
                      onClick={handleAddSlot}
                      disabled={saving}
                    >
                      <Check className="h-3.5 w-3.5 mr-1" />
                      {saving ? "Saving..." : "Save"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8"
                      onClick={() => {
                        setAdding(false);
                        setNewSlot({ start_time: "", end_time: "", notes: "" });
                      }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Add Button */}
        {!adding && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-3 h-9 border border-dashed border-border/50 text-muted-foreground hover:text-primary hover:border-primary/30"
            onClick={() => setAdding(true)}
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Add Time
          </Button>
        )}
      </div>

      {editingSlot && (
        <EditRoutineDialog
          slot={editingSlot}
          open={!!editingSlot}
          onOpenChange={(open) => !open && setEditingSlot(null)}
          onSuccess={() => { setEditingSlot(null); onUpdate(); }}
        />
      )}
      {deletingSlot && (
        <DeleteRoutineDialog
          slot={deletingSlot}
          open={!!deletingSlot}
          onOpenChange={(open) => !open && setDeletingSlot(null)}
          onSuccess={() => { setDeletingSlot(null); onUpdate(); }}
        />
      )}
    </>
  );
};
