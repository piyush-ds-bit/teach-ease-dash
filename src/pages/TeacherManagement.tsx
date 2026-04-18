import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { AddTeacherDialog } from "@/components/teachers/AddTeacherDialog";
import { TeachersTable, Teacher } from "@/components/teachers/TeachersTable";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";

const TeacherManagement = () => {
  const { toast } = useToast();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadTeachers = async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const { data, error } = await supabase
        .from('teachers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTeachers(data || []);
    } catch (error) {
      console.error('Error loading teachers:', error);
      toast({
        title: "Error",
        description: "Failed to load teachers",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      if (manual) setRefreshing(false);
    }
  };

  const handleTeacherDeleted = (userId: string) => {
    // Optimistic removal so UI never shows ghosts
    setTeachers((prev) => prev.filter((t) => t.user_id !== userId));
  };

  useEffect(() => {
    loadTeachers();

    // Real-time subscription
    const channel = supabase
      .channel('teachers_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'teachers' },
        () => loadTeachers()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-4 mb-6">
          <Link to="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Teacher Management</h1>
            <p className="text-muted-foreground">Add and manage teacher accounts</p>
          </div>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Teachers ({teachers.length})</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadTeachers(true)}
                disabled={refreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <AddTeacherDialog onTeacherAdded={() => loadTeachers()} />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <TeachersTable
                teachers={teachers}
                onTeacherUpdated={() => loadTeachers()}
                onTeacherDeleted={handleTeacherDeleted}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TeacherManagement;
