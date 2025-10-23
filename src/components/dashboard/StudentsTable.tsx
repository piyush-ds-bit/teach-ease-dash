import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, Search, User } from "lucide-react";

type Student = {
  id: string;
  name: string;
  class: string;
  contact_number: string;
  monthly_fee: number;
  joining_date: string;
  subject: string | null;
  profile_photo_url: string | null;
  total_paid?: number;
};

export const StudentsTable = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStudents();

    // Subscribe to payment changes for real-time updates
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

    // Subscribe to student changes as well
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
    const { data: studentsData } = await supabase
      .from("students")
      .select("*")
      .order("name");
    
    const { data: paymentsData } = await supabase
      .from("payments")
      .select("student_id, amount_paid");
    
    // Calculate total_paid for each student
    const studentsWithTotalPaid = studentsData?.map(student => {
      const studentPayments = paymentsData?.filter(p => p.student_id === student.id) || [];
      const total_paid = studentPayments.reduce((sum, p) => sum + Number(p.amount_paid), 0);
      return { ...student, total_paid };
    }) || [];
    
    setStudents(studentsWithTotalPaid);
    setLoading(false);
  };

  const calculateDue = (student: Student) => {
    const joiningDate = new Date(student.joining_date);
    const now = new Date();
  
    // Step 1: Calculate full months completed since joining (include joining month if fully completed)
    let monthsDiff =
      (now.getFullYear() - joiningDate.getFullYear()) * 12 +
      (now.getMonth() - joiningDate.getMonth());
  
    // If current day is before the joining day, the current month isn't fully completed
    if (now.getDate() < joiningDate.getDate()) {
      monthsDiff -= 1;
    }
  
    // Prevent negative months
    monthsDiff = Math.max(0, monthsDiff + 1); // +1 to include joining month once it completes
  
    // Step 2: Calculate total payable till now
    const totalPayable = monthsDiff * student.monthly_fee;
  
    // Step 3: Subtract total payments made
    const totalPaid = student.total_paid || 0;
    const totalDue = Math.max(0, totalPayable - totalPaid);
  
    return totalDue;
  };


  const getPaymentStatus = (due: number) => {
    if (due <= 0) return { label: "Paid", variant: "default" as const };
    if (due < 5000) return { label: "Partial", variant: "secondary" as const };
    return { label: "Pending", variant: "destructive" as const };
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
              const status = getPaymentStatus(totalDue);
              
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
                    <Badge variant={status.variant}>{status.label}</Badge>
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
