import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getStudentSession } from "@/lib/studentAuth";
import { StudentHeader } from "@/components/student/StudentHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Calendar, Phone, DollarSign, BookOpen, FileText } from "lucide-react";
import { format, parseISO } from "date-fns";

interface Student {
  id: string;
  name: string;
  class: string;
  contact_number: string;
  monthly_fee: number;
  joining_date: string;
  profile_photo_url: string | null;
  subject: string | null;
  remarks: string | null;
}

const StudentProfileView = () => {
  const session = getStudentSession();
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session) {
      loadProfile();
    }
  }, [session]);

  const loadProfile = async () => {
    if (!session) return;

    try {
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .eq("id", session.studentId)
        .single();

      if (error) throw error;
      if (data) setStudent(data);
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setLoading(false);
    }
  };

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

  if (!student) {
    return (
      <div className="min-h-screen bg-background">
        <StudentHeader />
        <div className="container py-8">
          <p className="text-center text-muted-foreground">Profile not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <StudentHeader />
      <main className="container py-8">
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              <Avatar className="h-32 w-32">
                <AvatarImage src={student.profile_photo_url || ""} />
                <AvatarFallback className="text-3xl">
                  {student.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="text-center sm:text-left">
                <CardTitle className="text-3xl mb-2">{student.name}</CardTitle>
                <CardDescription className="text-lg">
                  Class {student.class}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <Separator />
            
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Personal Information</h3>
                
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Contact Number</p>
                    <p className="font-medium">{student.contact_number}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Joining Date</p>
                    <p className="font-medium">
                      {format(parseISO(student.joining_date), "MMMM d, yyyy")}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <BookOpen className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Subject</p>
                    <p className="font-medium">{student.subject || "All Subjects"}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Fee Information</h3>
                
                <div className="flex items-center gap-3">
                  <DollarSign className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Monthly Fee</p>
                    <p className="font-medium text-lg">₹{student.monthly_fee}</p>
                  </div>
                </div>
              </div>
            </div>

            {student.remarks && (
              <>
                <Separator />
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <h3 className="font-semibold">Remarks</h3>
                  </div>
                  <p className="text-muted-foreground">{student.remarks}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default StudentProfileView;
