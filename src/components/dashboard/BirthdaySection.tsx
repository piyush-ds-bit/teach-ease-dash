import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Cake, TreePine, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  getTodaysBirthdays,
  getUpcomingBirthdays,
  type BirthdayStudent,
} from "@/lib/birthdayUtils";

export const BirthdaySection = () => {
  const navigate = useNavigate();
  const [todayBirthdays, setTodayBirthdays] = useState<BirthdayStudent[]>([]);
  const [upcomingBirthdays, setUpcomingBirthdays] = useState<BirthdayStudent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getTodaysBirthdays(), getUpcomingBirthdays(7)])
      .then(([today, upcoming]) => {
        setTodayBirthdays(today);
        setUpcomingBirthdays(upcoming);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card className="shadow-card">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const hasBirthdays = todayBirthdays.length > 0 || upcomingBirthdays.length > 0;

  if (!hasBirthdays) return null;

  return (
    <Card className="shadow-card border-l-4 border-l-primary">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Cake className="h-5 w-5 text-primary" />
          Birthdays
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {todayBirthdays.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-primary">🎂 Today</p>
            {todayBirthdays.map((s) => (
              <BirthdayRow
                key={s.id}
                student={s}
                label={`Turns ${s.age} today!`}
                onClick={() => navigate(`/student/${s.id}`)}
              />
            ))}
          </div>
        )}
        {upcomingBirthdays.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-muted-foreground">📅 Upcoming (7 days)</p>
            {upcomingBirthdays.map((s) => (
              <BirthdayRow
                key={s.id}
                student={s}
                label={`In ${s.daysUntil} day${s.daysUntil > 1 ? "s" : ""} · Turns ${s.age}`}
                onClick={() => navigate(`/student/${s.id}`)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

function BirthdayRow({
  student,
  label,
  onClick,
}: {
  student: BirthdayStudent;
  label: string;
  onClick: () => void;
}) {
  return (
    <div
      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
      onClick={onClick}
    >
      <Avatar className="h-9 w-9">
        <AvatarImage src={student.profile_photo_url || undefined} />
        <AvatarFallback className="bg-primary/10 text-primary text-xs">
          {student.name.charAt(0)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{student.name}</p>
        <p className="text-xs text-muted-foreground">Class {student.class}</p>
      </div>
      <Badge variant="secondary" className="text-xs shrink-0">
        {label}
      </Badge>
    </div>
  );
}
