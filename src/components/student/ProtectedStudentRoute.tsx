import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getStudentSession, clearStudentSession } from "@/lib/studentAuth";
import { Loader2 } from "lucide-react";

export const ProtectedStudentRoute = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      // Check Supabase Auth session
      const { data: { session } } = await supabase.auth.getSession();
      const studentInfo = getStudentSession();
      
      // Must have both a valid Supabase session AND student info
      if (session && studentInfo && session.user?.user_metadata?.is_student) {
        setIsAuthenticated(true);
      } else {
        // Clear any stale data
        if (studentInfo && !session) {
          await clearStudentSession();
        }
        setIsAuthenticated(false);
        navigate("/student-login");
      }
    };

    checkAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        clearStudentSession();
        setIsAuthenticated(false);
        navigate("/student-login");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
};