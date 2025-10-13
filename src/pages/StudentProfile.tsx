import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Phone, Calendar, DollarSign, Edit } from "lucide-react";
import { PaymentHistory } from "@/components/student/PaymentHistory";
import { AddPaymentDialog } from "@/components/student/AddPaymentDialog";
import { EditStudentDialog } from "@/components/student/EditStudentDialog";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";

type Student = {
  id: string;
  name: string;
  class: string;
  contact_number: string;
  monthly_fee: number;
  joining_date: string;
  remarks: string;
};

const StudentProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [totalPaid, setTotalPaid] = useState(0);
  const [totalDue, setTotalDue] = useState(0);

  useEffect(() => {
    if (id) {
      loadStudent();
      loadPayments();
    }
  }, [id]);

  const loadStudent = async () => {
    const { data } = await supabase
      .from("students")
      .select("*")
      .eq("id", id)
      .single();
    
    if (data) {
      setStudent(data);
      calculateDue(data);
    }
    setLoading(false);
  };

  const loadPayments = async () => {
    const { data } = await supabase
      .from("payments")
      .select("*")
      .eq("student_id", id);
    
    const total = data?.reduce((sum, p) => sum + Number(p.amount_paid), 0) || 0;
    setTotalPaid(total);
  };

  const calculateDue = (studentData: Student) => {
    const joiningDate = new Date(studentData.joining_date);
    const now = new Date();
    const monthsDiff = (now.getFullYear() - joiningDate.getFullYear()) * 12 + 
                       (now.getMonth() - joiningDate.getMonth()) + 1;
    const totalExpected = monthsDiff * studentData.monthly_fee;
    setTotalDue(Math.max(0, totalExpected - totalPaid));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!student) {
    return <div>Student not found</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <Button variant="ghost" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{student.name}</h1>
            <p className="text-muted-foreground">Class {student.class}</p>
          </div>
          <EditStudentDialog student={student} onUpdate={loadStudent} />
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Monthly Fee
              </CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{student.monthly_fee.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Paid
              </CardTitle>
              <DollarSign className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">₹{totalPaid.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Due
              </CardTitle>
              <DollarSign className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">₹{totalDue.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Joining Date
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-semibold">
                {new Date(student.joining_date).toLocaleDateString()}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{student.contact_number}</span>
            </div>
            {student.remarks && (
              <div>
                <p className="text-sm text-muted-foreground">Remarks:</p>
                <p>{student.remarks}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Payment History</h2>
          <AddPaymentDialog studentId={student.id} onPaymentAdded={() => {
            loadPayments();
            loadStudent();
          }} />
        </div>

        <PaymentHistory studentId={student.id} />
      </main>
    </div>
  );
};

export default StudentProfile;
