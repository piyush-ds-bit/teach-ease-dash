import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TreePine, Check, Plus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  getPlantDonationHistory,
  recordPlantDonation,
  deletePlantDonation,
} from "@/lib/birthdayUtils";

type PlantDonation = {
  id: string;
  donation_date: string;
  year: number;
  created_at: string;
};

type Props = {
  studentId: string;
  studentName: string;
  dateOfBirth: string | null;
};

export const PlantDonationSection = ({ studentId, studentName, dateOfBirth }: Props) => {
  const [donations, setDonations] = useState<PlantDonation[]>([]);
  const [loading, setLoading] = useState(true);
  const [recording, setRecording] = useState(false);
  const currentYear = new Date().getFullYear();

  const loadDonations = async () => {
    const data = await getPlantDonationHistory(studentId);
    setDonations(data);
    setLoading(false);
  };

  useEffect(() => {
    loadDonations();
  }, [studentId]);

  const currentYearDonated = donations.some((d) => d.year === currentYear);

  const handleRecord = async () => {
    setRecording(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const today = new Date().toISOString().split("T")[0];
      const result = await recordPlantDonation(studentId, currentYear, today, user.id);

      if (!result.success) {
        toast.error(result.error);
      } else {
        toast.success(`Plant donation recorded for ${studentName} (${currentYear})`);
        await loadDonations();
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setRecording(false);
    }
  };

  const handleDelete = async (id: string, year: number) => {
    const ok = await deletePlantDonation(id);
    if (ok) {
      toast.success(`Removed plant donation for ${year}`);
      await loadDonations();
    } else {
      toast.error("Failed to remove donation");
    }
  };

  if (loading) {
    return (
      <Card className="shadow-card">
        <CardContent className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <TreePine className="h-5 w-5 text-green-600" />
          Plant Donations
        </CardTitle>
        {!currentYearDonated ? (
          <Button size="sm" onClick={handleRecord} disabled={recording}>
            {recording ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Plus className="h-4 w-4 mr-1" />
            )}
            Record {currentYear}
          </Button>
        ) : (
          <Badge className="bg-green-100 text-green-800 border-green-300">
            <Check className="h-3 w-3 mr-1" />
            {currentYear} Done
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        {donations.length === 0 ? (
          <p className="text-sm text-muted-foreground">No plant donations recorded yet.</p>
        ) : (
          <div className="space-y-2">
            {donations.map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between p-2 rounded-lg bg-muted/30"
              >
                <div className="flex items-center gap-2">
                  <TreePine className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">{d.year}</span>
                  <span className="text-xs text-muted-foreground">
                    — {new Date(d.donation_date).toLocaleDateString()}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => handleDelete(d.id, d.year)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
