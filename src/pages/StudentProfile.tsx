import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Phone, Calendar, DollarSign, Edit, Eye, EyeOff, User } from "lucide-react";
import { PaymentHistory } from "@/components/student/PaymentHistory";
import { AddPaymentDialog } from "@/components/student/AddPaymentDialog";
import { EditStudentDialog } from "@/components/student/EditStudentDialog";
import { DeleteStudentDialog } from "@/components/student/DeleteStudentDialog";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { GenerateReceiptButton } from "@/components/student/GenerateReceiptButton";
import { HomeworkList } from "@/components/homework/HomeworkList";

type Student = {
  id: string;
  name: string;
  class: string;
  contact_number: string;
  monthly_fee: number;
  joining_date: string;
  subject: string | null;
  remarks: string;
  profile_photo_url: string | null;
};

const StudentProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [totalPaid, setTotalPaid] = useState(0);
  const [totalDue, setTotalDue] = useState(0);
  const [pendingMonths, setPendingMonths] = useState<string[]>([]);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);

  const [cardVisibility, setCardVisibility] = useState({
    monthlyFee: false,
    totalPaid: false,
    totalDue: false,
  });

  const toggleCardVisibility = async (key: keyof typeof cardVisibility) => {
    const newVisibility = { ...cardVisibility, [key]: !cardVisibility[key] };
    setCardVisibility(newVisibility);
    
    // Save to Supabase
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          profile_cards_visible: newVisibility.monthlyFee || newVisibility.totalPaid || newVisibility.totalDue,
        });
    }
  };

  useEffect(() => {
    if (id) {
      loadData();
      loadPreferences();
    }
  }, [id]);

  const loadPreferences = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('user_preferences')
        .select('profile_cards_visible')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (data?.profile_cards_visible) {
        setCardVisibility({
          monthlyFee: false,
          totalPaid: false,
          totalDue: false,
        });
      }
    }
  };

  const loadData = async () => {
    // Load both student and payments data
    const [studentResult, paymentsResult] = await Promise.all([
      supabase.from("students").select("*").eq("id", id).single(),
      supabase.from("payments").select("*").eq("student_id", id)
    ]);
    
    if (studentResult.data) {
      setStudent(studentResult.data);
      
      // Calculate total paid
      const total = paymentsResult.data?.reduce((sum, p) => sum + Number(p.amount_paid), 0) || 0;
      setTotalPaid(total);
      
      // Calculate due amount and pending months (EXCLUDING joining month AND current month)
      const joiningDate = new Date(studentResult.data.joining_date);
      const now = new Date();
      
      // Calculate months from joining to previous month (exclude current month)
      const monthsEnrolled = (now.getFullYear() - joiningDate.getFullYear()) * 12 + 
                             (now.getMonth() - joiningDate.getMonth());
      
      // Subtract 1 to exclude joining month, ensure non-negative
      const monthsDiff = Math.max(0, monthsEnrolled);
      const totalExpected = monthsDiff * studentResult.data.monthly_fee;
      const dueAmount = Math.max(0, totalExpected - total);
      setTotalDue(dueAmount);
      
      // Calculate pending months (start from first month after joining, end before current month)
      const paidMonths = new Set(paymentsResult.data?.map(p => p.month) || []);
      const pending: string[] = [];
      
      for (let i = 1; i <= monthsDiff; i++) {
        const date = new Date(joiningDate);
        date.setMonth(joiningDate.getMonth() + i);
        const monthYear = date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
        if (!paidMonths.has(monthYear)) {
          pending.push(monthYear);
        }
      }
      
      setPendingMonths(pending);
    }
    setLoading(false);
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

        <div className="flex items-center gap-6">
          <div 
            className="w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden bg-muted flex items-center justify-center border-4 border-primary cursor-pointer flex-shrink-0"
            onClick={() => student.profile_photo_url && setPhotoModalOpen(true)}
          >
            {student.profile_photo_url ? (
              <img 
                src={student.profile_photo_url} 
                alt={student.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold">{student.name}</h1>
            <p className="text-muted-foreground">Class {student.class}</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div></div>
          <div className="flex flex-wrap gap-2">
            {totalDue > 0 && (
              <GenerateReceiptButton
                studentName={student.name}
                studentId={student.id}
                monthlyFee={student.monthly_fee}
                totalDue={totalDue}
                joiningDate={student.joining_date}
                pendingMonths={pendingMonths}
                subject={student.subject}
                profilePhotoUrl={student.profile_photo_url}
              />
            )}
            <EditStudentDialog student={student} onUpdate={loadData} />
            <DeleteStudentDialog studentId={student.id} studentName={student.name} />
          </div>
        </div>

        <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-4">
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <div className="flex items-center justify-between w-full">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                  Monthly Fee
                </CardTitle>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => toggleCardVisibility('monthlyFee')}
                    aria-label="Toggle visibility"
                  >
                    {cardVisibility.monthlyFee ? (
                      <Eye className="h-3 w-3" />
                    ) : (
                      <EyeOff className="h-3 w-3" />
                    )}
                  </Button>
                  <DollarSign className="h-4 w-4 text-primary" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-lg sm:text-2xl font-bold transition-all duration-300 ${!cardVisibility.monthlyFee ? 'blur-md select-none' : ''}`}>
                {cardVisibility.monthlyFee ? `₹${student.monthly_fee.toLocaleString()}` : '••••••'}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <div className="flex items-center justify-between w-full">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                  Total Paid
                </CardTitle>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => toggleCardVisibility('totalPaid')}
                    aria-label="Toggle visibility"
                  >
                    {cardVisibility.totalPaid ? (
                      <Eye className="h-3 w-3" />
                    ) : (
                      <EyeOff className="h-3 w-3" />
                    )}
                  </Button>
                  <DollarSign className="h-4 w-4 text-success" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-lg sm:text-2xl font-bold text-success transition-all duration-300 ${!cardVisibility.totalPaid ? 'blur-md select-none' : ''}`}>
                {cardVisibility.totalPaid ? `₹${totalPaid.toLocaleString()}` : '••••••'}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <div className="flex items-center justify-between w-full">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                  Total Due
                </CardTitle>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => toggleCardVisibility('totalDue')}
                    aria-label="Toggle visibility"
                  >
                    {cardVisibility.totalDue ? (
                      <Eye className="h-3 w-3" />
                    ) : (
                      <EyeOff className="h-3 w-3" />
                    )}
                  </Button>
                  <DollarSign className="h-4 w-4 text-warning" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-lg sm:text-2xl font-bold text-warning transition-all duration-300 ${!cardVisibility.totalDue ? 'blur-md select-none' : ''}`}>
                {cardVisibility.totalDue ? `₹${totalDue.toLocaleString()}` : '••••••'}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                Joining Date
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-sm sm:text-lg font-semibold">
                {new Date(student.joining_date).toLocaleDateString()}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Student Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{student.contact_number}</span>
            </div>
            {student.subject && (
              <div>
                <p className="text-sm text-muted-foreground">Subject:</p>
                <p>{student.subject}</p>
              </div>
            )}
            {student.remarks && (
              <div>
                <p className="text-sm text-muted-foreground">Remarks:</p>
                <p>{student.remarks}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Tabs defaultValue="payments" className="space-y-4">
          <TabsList>
            <TabsTrigger value="payments">Payment History</TabsTrigger>
            <TabsTrigger value="homework">Homework</TabsTrigger>
          </TabsList>

          <TabsContent value="payments" className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h2 className="text-xl sm:text-2xl font-bold">Payment History</h2>
              <AddPaymentDialog studentId={student.id} onPaymentAdded={loadData} />
            </div>
            <PaymentHistory studentId={student.id} />
          </TabsContent>

          <TabsContent value="homework">
            <HomeworkList studentId={student.id} />
          </TabsContent>
        </Tabs>

        {student.profile_photo_url && (
          <Dialog open={photoModalOpen} onOpenChange={setPhotoModalOpen}>
            <DialogContent className="max-w-2xl">
              <img 
                src={student.profile_photo_url} 
                alt={student.name}
                className="w-full h-auto rounded-lg"
              />
            </DialogContent>
          </Dialog>
        )}
      </main>
    </div>
  );
};

export default StudentProfile;
