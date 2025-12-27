import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface ProtectedAdminRouteProps {
  children: React.ReactNode;
}

export const ProtectedAdminRoute = ({ children }: ProtectedAdminRouteProps) => {
  const navigate = useNavigate();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAdminAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          setIsAuthorized(false);
          navigate("/auth");
          return;
        }

        // Check if user has admin role using the has_role RPC function
        const { data: hasRole, error } = await supabase.rpc('has_role', {
          _user_id: session.user.id,
          _role: 'admin'
        });

        if (error) {
          console.error("Error checking admin role:", error);
          setIsAuthorized(false);
          navigate("/auth");
          return;
        }

        if (!hasRole) {
          // User is authenticated but not an admin
          // Check if they might be a student
          const studentInfo = localStorage.getItem('student_session');
          if (studentInfo) {
            navigate("/student-dashboard");
          } else {
            navigate("/auth");
          }
          setIsAuthorized(false);
          return;
        }

        setIsAuthorized(true);
      } catch (error) {
        console.error("Auth check failed:", error);
        setIsAuthorized(false);
        navigate("/auth");
      }
    };

    checkAdminAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        setIsAuthorized(false);
        navigate("/auth");
      } else if (event === "SIGNED_IN") {
        // Re-check admin status on sign in
        checkAdminAuth();
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (isAuthorized === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return <>{children}</>;
};
