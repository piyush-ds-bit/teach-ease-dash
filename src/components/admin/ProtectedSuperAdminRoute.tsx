import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface ProtectedSuperAdminRouteProps {
  children: React.ReactNode;
}

export const ProtectedSuperAdminRoute = ({ children }: ProtectedSuperAdminRouteProps) => {
  const navigate = useNavigate();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    const checkSuperAdmin = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          setIsAuthorized(false);
          navigate("/auth");
          return;
        }

        // Check for super_admin role only
        const { data: hasSuperAdminRole, error } = await supabase.rpc('has_role', {
          _user_id: session.user.id,
          _role: 'super_admin'
        });

        if (error || !hasSuperAdminRole) {
          setIsAuthorized(false);
          navigate("/dashboard");
          return;
        }

        setIsAuthorized(true);
      } catch (error) {
        console.error("Super admin check failed:", error);
        setIsAuthorized(false);
        navigate("/dashboard");
      }
    };

    checkSuperAdmin();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        setIsAuthorized(false);
        navigate("/auth");
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
