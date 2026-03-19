import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Cake, X, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  getTodaysBirthdays,
  getUpcomingBirthdays,
  type BirthdayStudent,
} from "@/lib/birthdayUtils";

const ConfettiDot = ({ delay, x, color }: { delay: number; x: number; color: string }) => (
  <motion.div
    className="absolute rounded-full pointer-events-none"
    style={{ width: 6, height: 6, backgroundColor: color, top: -8, left: `${x}%` }}
    initial={{ opacity: 1, y: 0, scale: 1 }}
    animate={{ opacity: 0, y: 80, scale: 0, x: (Math.random() - 0.5) * 60 }}
    transition={{ duration: 1.2, delay, ease: "easeOut" }}
  />
);

const confettiColors = [
  "hsl(var(--primary))",
  "#f59e0b",
  "#10b981",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
];

export const BirthdaySection = () => {
  const navigate = useNavigate();
  const [todayBirthdays, setTodayBirthdays] = useState<BirthdayStudent[]>([]);
  const [upcomingBirthdays, setUpcomingBirthdays] = useState<BirthdayStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

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

  if (!hasBirthdays || dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <Card className="shadow-card border-l-4 border-l-primary relative overflow-hidden">
          {/* One-time confetti burst for today's birthdays */}
          {todayBirthdays.length > 0 && (
            <div className="absolute inset-x-0 top-0 h-24 pointer-events-none overflow-hidden">
              {Array.from({ length: 18 }).map((_, i) => (
                <ConfettiDot
                  key={i}
                  delay={i * 0.06}
                  x={5 + Math.random() * 90}
                  color={confettiColors[i % confettiColors.length]}
                />
              ))}
            </div>
          )}

          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <motion.div
                animate={{ rotate: [0, -10, 10, -10, 0] }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                <Cake className="h-5 w-5 text-primary" />
              </motion.div>
              Birthdays
            </CardTitle>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDismissed(true)}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {todayBirthdays.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-primary">🎂 Today</p>
                {todayBirthdays.map((s, i) => (
                  <motion.div
                    key={s.id}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.35, delay: 0.15 + i * 0.08 }}
                  >
                    <BirthdayRow
                      student={s}
                      label={`Turns ${s.age} today!`}
                      onClick={() => navigate(`/student/${s.id}`)}
                    />
                  </motion.div>
                ))}
              </div>
            )}
            {upcomingBirthdays.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-muted-foreground">📅 Upcoming (7 days)</p>
                {upcomingBirthdays.map((s, i) => (
                  <motion.div
                    key={s.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 + i * 0.07 }}
                  >
                    <BirthdayRow
                      student={s}
                      label={`In ${s.daysUntil} day${s.daysUntil > 1 ? "s" : ""} · Turns ${s.age}`}
                      onClick={() => navigate(`/student/${s.id}`)}
                    />
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
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
