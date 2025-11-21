import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, TrendingUp, Users, DollarSign, User, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getStudentSession } from "@/lib/studentAuth";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Check for existing admin session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard");
      }
    });

    // Check for existing student session
    const studentSession = getStudentSession();
    if (studentSession) {
      navigate("/student-dashboard");
    }
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background">
      <div className="absolute top-4 left-4 sm:top-8 sm:left-8">
        <h2 className="text-xl sm:text-2xl font-semibold text-foreground">Ram Ram Piyush</h2>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center space-y-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-primary shadow-hover">
            <GraduationCap className="h-10 w-10 text-primary-foreground" />
          </div>
          
          <div className="space-y-4">
            <h1 className="text-5xl md:text-6xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              TeachEase Dashboard
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Streamline your tuition management with powerful tools to track students, fees, and payments—all in one place.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto pt-8">
            <Card className="cursor-pointer hover:shadow-hover transition-shadow" onClick={() => navigate("/auth")}>
              <CardHeader>
                <div className="flex items-center justify-center mb-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Shield className="h-6 w-6 text-primary" />
                  </div>
                </div>
                <CardTitle className="text-center">Admin Login</CardTitle>
                <CardDescription className="text-center">
                  Manage students, payments, and homework
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" size="lg">
                  Login as Admin
                </Button>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-hover transition-shadow" onClick={() => navigate("/student-login")}>
              <CardHeader>
                <div className="flex items-center justify-center mb-4">
                  <div className="w-12 h-12 rounded-lg bg-success/10 flex items-center justify-center">
                    <User className="h-6 w-6 text-success" />
                  </div>
                </div>
                <CardTitle className="text-center">Student Login</CardTitle>
                <CardDescription className="text-center">
                  View your profile, payments, and homework
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" variant="outline" size="lg">
                  Login as Student
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="grid md:grid-cols-3 gap-6 pt-16 max-w-4xl mx-auto">
            <div className="p-6 rounded-xl bg-card shadow-card hover:shadow-hover transition-shadow">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Student Management</h3>
              <p className="text-sm text-muted-foreground">
                Easily add, edit, and track all your students in one organized dashboard
              </p>
            </div>

            <div className="p-6 rounded-xl bg-card shadow-card hover:shadow-hover transition-shadow">
              <div className="w-12 h-12 rounded-lg bg-success/10 flex items-center justify-center mx-auto mb-4">
                <DollarSign className="h-6 w-6 text-success" />
              </div>
              <h3 className="font-semibold mb-2">Payment Tracking</h3>
              <p className="text-sm text-muted-foreground">
                Record payments with proof uploads and keep complete payment history
              </p>
            </div>

            <div className="p-6 rounded-xl bg-card shadow-card hover:shadow-hover transition-shadow">
              <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="h-6 w-6 text-accent" />
              </div>
              <h3 className="font-semibold mb-2">Smart Analytics</h3>
              <p className="text-sm text-muted-foreground">
                Track fees collected, pending amounts, and get insights at a glance
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
