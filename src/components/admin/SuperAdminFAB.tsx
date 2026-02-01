import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";
import { Link } from "react-router-dom";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export const SuperAdminFAB = () => {
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    const checkRole = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: hasRole } = await supabase.rpc('has_role', {
        _user_id: session.user.id,
        _role: 'super_admin'
      });

      setIsSuperAdmin(!!hasRole);
    };

    checkRole();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkRole();
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!isSuperAdmin) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link to="/super-admin/teachers">
            <Button
              size="icon"
              className="fixed bottom-6 left-6 h-14 w-14 rounded-full shadow-lg z-50 bg-gradient-primary hover:opacity-90"
            >
              <Users className="h-6 w-6" />
            </Button>
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>Manage Teachers</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
