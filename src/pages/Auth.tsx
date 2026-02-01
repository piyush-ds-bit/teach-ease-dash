import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { GraduationCap, Loader2 } from "lucide-react";

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate("/dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Check if the user is banned (suspended)
        if (error.message.includes('banned') || error.message.includes('suspended')) {
          toast({
            title: "Account Paused",
            description: "Your account has been temporarily paused. Please contact the administrator.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Login failed",
            description: error.message,
            variant: "destructive",
          });
        }
        return;
      }

      // Check if the user has a valid role (teacher, admin, or super_admin)
      if (data.session) {
        const { data: hasTeacherRole } = await supabase.rpc('has_role', {
          _user_id: data.session.user.id,
          _role: 'teacher'
        });

        const { data: hasAdminRole } = await supabase.rpc('has_role', {
          _user_id: data.session.user.id,
          _role: 'admin'
        });

        const { data: hasSuperAdminRole } = await supabase.rpc('has_role', {
          _user_id: data.session.user.id,
          _role: 'super_admin'
        });

        if (!hasTeacherRole && !hasAdminRole && !hasSuperAdminRole) {
          await supabase.auth.signOut();
          toast({
            title: "Access Denied",
            description: "You don't have permission to access this application.",
            variant: "destructive",
          });
          return;
        }

        // Check if teacher is suspended in the teachers table
        if ((hasTeacherRole || hasAdminRole) && !hasSuperAdminRole) {
          const { data: teacher } = await supabase
            .from('teachers')
            .select('status')
            .eq('user_id', data.session.user.id)
            .single();

          if (teacher?.status === 'suspended') {
            await supabase.auth.signOut();
            toast({
              title: "Account Paused",
              description: "Your account has been temporarily paused. Please contact the administrator.",
              variant: "destructive",
            });
            return;
          }
        }
      }

      // Success - navigation handled by onAuthStateChange
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md shadow-hover">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center">
            <GraduationCap className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">TeachEase Dashboard</CardTitle>
          <CardDescription>Sign in to manage your tuition business</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="teacher@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
