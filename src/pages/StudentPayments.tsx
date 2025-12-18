import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getStudentSession } from "@/lib/studentAuth";
import { StudentHeader } from "@/components/student/StudentHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Calendar } from "lucide-react";
import { format, parseISO } from "date-fns";
import { calculateTotalPayable, calculateTotalPaidFromPayments } from "@/lib/feeCalculation";

interface Student {
  monthly_fee: number;
  joining_date: string;
  paused_months: string[] | null;
}

interface Payment {
  id: string;
  amount_paid: number;
  payment_date: string;
  payment_mode: string;
  month: string;
  transaction_id: string | null;
}

const StudentPayments = () => {
  const session = getStudentSession();
  const [student, setStudent] = useState<Student | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session) {
      loadPaymentData();
    }
  }, [session]);

  const loadPaymentData = async () => {
    if (!session) return;

    try {
      const { data: studentData } = await supabase
        .from("students")
        .select("monthly_fee, joining_date, paused_months")
        .eq("id", session.studentId)
        .single();

      if (studentData) {
        setStudent(studentData);
      }

      const { data: paymentsData } = await supabase
        .from("payments")
        .select("*")
        .eq("student_id", session.studentId)
        .order("payment_date", { ascending: false });

      if (paymentsData) {
        setPayments(paymentsData);
      }
    } catch (error) {
      console.error("Error loading payment data:", error);
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
  const totalDue = calculateDue();

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
      <main className="container py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Payment History</h1>
          <p className="text-muted-foreground">View your payment records and dues</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Monthly Fee</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{student?.monthly_fee || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Per month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">₹{totalPaid}</div>
              <p className="text-xs text-muted-foreground mt-1">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Due</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">₹{totalDue}</div>
              <p className="text-xs text-muted-foreground mt-1">Outstanding</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Payment Records</CardTitle>
            <CardDescription>Complete history of all your payments</CardDescription>
          </CardHeader>
          <CardContent>
            {payments.length > 0 ? (
              <div className="space-y-3">
                {payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border bg-card"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-lg">₹{payment.amount_paid}</p>
                        <Badge variant="outline">{payment.payment_mode}</Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(parseISO(payment.payment_date), "MMM d, yyyy")}
                        </div>
                        <div>Month: {payment.month}</div>
                      </div>
                      {payment.transaction_id && (
                        <p className="text-xs text-muted-foreground">
                          Transaction ID: {payment.transaction_id}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No payment records yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default StudentPayments;
