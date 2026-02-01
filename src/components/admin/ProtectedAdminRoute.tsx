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
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          setIsAuthorized(false);
          navigate("/auth");
          return;
        }

        // Check if user has teacher, admin, or super_admin role
        const { data: hasTeacherRole } = await supabase.rpc('has_role', {
          _user_id: session.user.id,
          _role: 'teacher'
        });

        const { data: hasAdminRole } = await supabase.rpc('has_role', {
          _user_id: session.user.id,
          _role: 'admin'
        });

        const { data: hasSuperAdminRole } = await supabase.rpc('has_role', {
          _user_id: session.user.id,
          _role: 'super_admin'
        });

        if (!hasTeacherRole && !hasAdminRole && !hasSuperAdminRole) {
          setIsAuthorized(false);
          navigate("/auth");
          return;
        }

        // Check if teacher is suspended (not applicable for super_admin)
        if ((hasTeacherRole || hasAdminRole) && !hasSuperAdminRole) {
          const { data: teacher } = await supabase
            .from('teachers')
            .select('status')
            .eq('user_id', session.user.id)
            .single();

          if (teacher?.status === 'suspended') {
            await supabase.auth.signOut();
            setIsAuthorized(false);
            navigate("/auth");
            return;
          }
        }

        setIsAuthorized(true);
      } catch (error) {
        console.error("Auth check failed:", error);
        setIsAuthorized(false);
        navigate("/auth");
      }
    };

    checkAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        setIsAuthorized(false);
        navigate("/auth");
      } else if (event === "SIGNED_IN") {
        checkAuth();
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
