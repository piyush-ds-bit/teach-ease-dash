import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getStudentSession } from "@/lib/studentAuth";
import { StudentHeader } from "@/components/student/StudentHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Calendar, DollarSign, BookOpen, Clock } from "lucide-react";
import { format, isToday, parseISO } from "date-fns";
import { calculateTotalPayable, calculateTotalPaidFromPayments } from "@/lib/feeCalculation";

interface Student {
  id: string;
  name: string;
  class: string;
  monthly_fee: number;
  profile_photo_url: string | null;
  subject: string | null;
  joining_date: string;
  paused_months: string[] | null;
}

interface Payment {
  id: string;
  amount_paid: number;
  payment_date: string;
  payment_mode: string;
}

interface Routine {
  id: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  notes: string | null;
}

interface Homework {
  id: string;
  title: string;
  due_date: string;
  completed: boolean;
}

const StudentDashboard = () => {
  const session = getStudentSession();
  const [student, setStudent] = useState<Student | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [homework, setHomework] = useState<Homework[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session) {
      loadDashboardData();
    }
  }, [session]);

  const loadDashboardData = async () => {
    if (!session) return;

    try {
      const { data: studentData } = await supabase
        .from("students")
        .select("*")
        .eq("id", session.studentId)
        .single();

      if (studentData) {
        setStudent(studentData);
      }

      const { data: paymentsData } = await supabase
        .from("payments")
        .select("*")
        .eq("student_id", session.studentId)
        .order("payment_date", { ascending: false })
        .limit(3);

      if (paymentsData) {
        setPayments(paymentsData);
      }

      const today = format(new Date(), "EEEE");
      const { data: routineData } = await supabase
        .from("routines")
        .select("*")
        .eq("day_of_week", today)
        .order("start_time", { ascending: true })
        .limit(3);

      if (routineData) {
        setRoutines(routineData);
      }

      const { data: homeworkData } = await supabase
        .from("homework")
        .select("*")
        .eq("student_id", session.studentId)
        .eq("completed", false)
        .order("due_date", { ascending: true })
        .limit(5);

      if (homeworkData) {
        setHomework(homeworkData);
      }
    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateDue = () => {
    if (!student) return 0;

    const joiningDate = new Date(student.joining_date);
    const pausedMonths = student.paused_months || [];
    const monthlyFee = Number(student.monthly_fee);

    const totalPayable = calculateTotalPayable(joiningDate, monthlyFee, pausedMonths);
    const totalPaid = calculateTotalPaidFromPayments(payments);
    return Math.max(0, totalPayable - totalPaid);
  };

  const totalPaid = calculateTotalPaidFromPayments(payments);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <StudentHeader />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <StudentHeader />
      <main className="container py-8 space-y-8">
        {/* Profile Summary */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={student?.profile_photo_url || ""} />
                <AvatarFallback className="text-lg">
                  {student?.name?.charAt(0) || "S"}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-2xl">{student?.name}</CardTitle>
                <CardDescription>
                  Class {student?.class} • {student?.subject || "All Subjects"}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Monthly Fee</p>
                  <p className="text-lg font-semibold">₹{student?.monthly_fee}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-success" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Paid</p>
                  <p className="text-lg font-semibold text-success">
                    ₹{totalPaid}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-destructive" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Due</p>
                  <p className="text-lg font-semibold text-destructive">₹{calculateDue()}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Today's Routine */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Today's Schedule
              </CardTitle>
            </CardHeader>
            <CardContent>
              {routines.length > 0 ? (
                <div className="space-y-3">
                  {routines.map((routine) => (
                    <div
                      key={routine.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted"
                    >
                      <div>
                        <p className="font-medium">
                          {routine.start_time} - {routine.end_time}
                        </p>
                        {routine.notes && (
                          <p className="text-sm text-muted-foreground">{routine.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No classes scheduled for today</p>
              )}
            </CardContent>
          </Card>

          {/* Recent Payments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Recent Payments
              </CardTitle>
            </CardHeader>
            <CardContent>
              {payments.length > 0 ? (
                <div className="space-y-3">
                  {payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted"
                    >
                      <div>
                        <p className="font-medium">₹{payment.amount_paid}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(parseISO(payment.payment_date), "MMM d, yyyy")}
                        </p>
                      </div>
                      <Badge variant="outline">{payment.payment_mode}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No payment records yet</p>
              )}
            </CardContent>
          </Card>

          {/* Pending Homework */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Pending Homework ({homework.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {homework.length > 0 ? (
                <div className="space-y-3">
                  {homework.map((hw) => {
                    const dueDate = parseISO(hw.due_date);
                    const isOverdue = dueDate < new Date() && !isToday(dueDate);
                    const isDueToday = isToday(dueDate);

                    return (
                      <div
                        key={hw.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted"
                      >
                        <div className="flex-1">
                          <p className="font-medium">{hw.title}</p>
                          <p className="text-sm text-muted-foreground">
                            Due: {format(dueDate, "MMM d, yyyy")}
                          </p>
                        </div>
                        <Badge
                          variant={isOverdue ? "destructive" : isDueToday ? "default" : "outline"}
                        >
                          {isOverdue ? "Overdue" : isDueToday ? "Due Today" : "Upcoming"}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No pending homework</p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default StudentDashboard;
