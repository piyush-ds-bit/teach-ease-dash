import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { EditRoutineDialog } from "./EditRoutineDialog";
import { DeleteRoutineDialog } from "./DeleteRoutineDialog";

type RoutineSlot = {
  id: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  notes: string | null;
  created_at: string;
};

type RoutineCardProps = {
  day: string;
  slots: RoutineSlot[];
  onUpdate: () => void;
};

export const RoutineCard = ({ day, slots, onUpdate }: RoutineCardProps) => {
  const [editingSlot, setEditingSlot] = useState<RoutineSlot | null>(null);
  const [deletingSlot, setDeletingSlot] = useState<RoutineSlot | null>(null);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{day}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {slots.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No classes scheduled</p>
          ) : (
            slots.map((slot) => (
              <div
                key={slot.id}
                className="p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">
                      {slot.start_time} – {slot.end_time}
                    </p>
                    {slot.notes && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {slot.notes}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setEditingSlot(slot)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      onClick={() => setDeletingSlot(slot)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {editingSlot && (
        <EditRoutineDialog
          slot={editingSlot}
          open={!!editingSlot}
          onOpenChange={(open) => !open && setEditingSlot(null)}
          onSuccess={() => {
            setEditingSlot(null);
            onUpdate();
          }}
        />
      )}

      {deletingSlot && (
        <DeleteRoutineDialog
          slot={deletingSlot}
          open={!!deletingSlot}
          onOpenChange={(open) => !open && setDeletingSlot(null)}
          onSuccess={() => {
            setDeletingSlot(null);
            onUpdate();
          }}
        />
      )}
    </>
  );
};
