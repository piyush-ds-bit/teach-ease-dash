import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, Search, User } from "lucide-react";
import { StudentStatusBadge } from "@/components/student/StudentStatusBadge";
import { getStudentStatusFromData } from "@/lib/statusCalculation";
import {
  FeeHistoryEntry,
  calculateTotalPayableWithHistory,
  dateToMonthKey,
} from "@/lib/feeHistoryCalculation";

type Student = {
  id: string;
  name: string;
  class: string;
  contact_number: string;
  monthly_fee: number;
  joining_date: string;
  subject: string | null;
  profile_photo_url: string | null;
  paused_months: string[] | null;
  total_paid?: number;
  last_payment_date?: string | null;
  fee_history?: FeeHistoryEntry[];
};

export const StudentsTable = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStudents();

    const paymentsChannel = supabase
      .channel('students-table-payment-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payments'
        },
        () => {
          loadStudents();
        }
      )
      .subscribe();

    const studentsChannel = supabase
      .channel('students-table-student-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'students'
        },
        () => {
          loadStudents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(paymentsChannel);
      supabase.removeChannel(studentsChannel);
    };
  }, []);

  const loadStudents = async () => {
    const [studentsData, paymentsData, feeHistoryData] = await Promise.all([
      supabase.from("students").select("*").order("name"),
      supabase.from("payments").select("student_id, amount_paid, payment_date"),
      supabase.from("student_fee_history").select("*").order("effective_from_month"),
    ]);
    
    const studentsWithPaymentInfo = studentsData.data?.map(student => {
      const studentPayments = paymentsData.data?.filter(p => p.student_id === student.id) || [];
      const total_paid = studentPayments.reduce((sum, p) => sum + Number(p.amount_paid), 0);
      
      // Find most recent payment date
      const sortedPayments = [...studentPayments].sort(
        (a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
      );
      const last_payment_date = sortedPayments[0]?.payment_date || null;

      // Get fee history for this student
      const studentFeeHistory = feeHistoryData.data?.filter(
        (fh) => fh.student_id === student.id
      ) as FeeHistoryEntry[] || [];
      
      return { ...student, total_paid, last_payment_date, fee_history: studentFeeHistory };
    }) || [];
    
    setStudents(studentsWithPaymentInfo);
    setLoading(false);
  };

  const calculateDue = (student: Student) => {
    const joiningDate = new Date(student.joining_date);
    const pausedMonths = student.paused_months || [];
    const feeHistory = student.fee_history || [];
    const totalPaid = student.total_paid || 0;

    // Use fee history if available, otherwise fallback to legacy
    if (feeHistory.length > 0) {
      const totalPayable = calculateTotalPayableWithHistory(joiningDate, feeHistory, pausedMonths);
      return Math.max(0, totalPayable - totalPaid);
    }

    // Fallback: Create synthetic fee history from current monthly fee
    const syntheticHistory: FeeHistoryEntry[] = [{
      id: 'synthetic',
      student_id: student.id,
      monthly_fee: Number(student.monthly_fee),
      effective_from_month: dateToMonthKey(joiningDate),
      created_at: new Date().toISOString(),
      teacher_id: null,
    }];
    const totalPayable = calculateTotalPayableWithHistory(joiningDate, syntheticHistory, pausedMonths);
    return Math.max(0, totalPayable - totalPaid);
  };

  const getPaymentStatus = (due: number) => {
    if (due <= 0) {
      return { label: "Paid", variant: "default" as const };
    } else {
      return { label: "Pending", variant: "destructive" as const };
    }
  };

  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.class.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <div className="text-center py-8">Loading students...</div>;
  }

  return (
    <Card className="shadow-card">
      <div className="p-4 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or class..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Photo
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Class
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Monthly Fee
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Contact
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Total Due
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Payment
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-border">
            {filteredStudents.map((student) => {
              const totalDue = calculateDue(student);
              const paymentStatus = getPaymentStatus(totalDue);
              const studentStatus = getStudentStatusFromData(
                student.paused_months,
                student.last_payment_date ? [{ payment_date: student.last_payment_date }] : []
              );
              
              return (
                <tr key={student.id} className="hover:bg-muted/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-muted flex items-center justify-center">
                      {student.profile_photo_url ? (
                        <img 
                          src={student.profile_photo_url} 
                          alt={student.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-medium">
                    {student.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">
                    {student.class}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    ₹{student.monthly_fee.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">
                    {student.contact_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-semibold">
                    ₹{totalDue.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant={paymentStatus.variant}>{paymentStatus.label}</Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StudentStatusBadge status={studentStatus} size="sm" />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/student/${student.id}`)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
};
