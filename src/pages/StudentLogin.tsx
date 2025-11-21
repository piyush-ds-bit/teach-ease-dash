import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { verifyPassword, setStudentSession, getStudentSession } from "@/lib/studentAuth";
import { toast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

const StudentLogin = () => {
  const navigate = useNavigate();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if already logged in
    const session = getStudentSession();
    if (session) {
      navigate("/student-dashboard");
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Query student by login_id
      const { data: student, error } = await supabase
        .from("students")
        .select("id, login_id, password_hash, name")
        .eq("login_id", loginId)
        .maybeSingle();

      if (error || !student) {
        toast({
          title: "Invalid credentials",
          description: "Student ID or password is incorrect.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      if (!student.password_hash) {
        toast({
          title: "Account not configured",
          description: "Please contact your administrator to set up your password.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Verify password
      const isValid = await verifyPassword(password, student.password_hash);

      if (!isValid) {
        toast({
          title: "Invalid credentials",
          description: "Student ID or password is incorrect.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Set session
      setStudentSession(student.id, student.login_id, student.name);

      toast({
        title: "Login successful",
        description: `Welcome back, ${student.name}!`,
      });

      navigate("/student-dashboard");
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: "Login failed",
        description: "An error occurred during login. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted to-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4">
          <div className="flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-primary">
              <GraduationCap className="h-7 w-7 text-primary-foreground" />
            </div>
          </div>
          <div className="text-center">
            <CardTitle className="text-2xl">Student Login</CardTitle>
            <CardDescription>
              Enter your student ID and password to access your portal
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="loginId">Student ID</Label>
              <Input
                id="loginId"
                placeholder="STU123456"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value.toUpperCase())}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign In
            </Button>
          </form>
          <div className="mt-6 text-center">
            <Link to="/auth" className="text-sm text-muted-foreground hover:text-primary">
              Admin Login →
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentLogin;
