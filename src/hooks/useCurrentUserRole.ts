import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type UserRole = 'super_admin' | 'admin' | 'teacher' | 'user' | null;

export function useCurrentUserRole() {
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);

  const checkRoles = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setRole(null);
        setLoading(false);
        return;
      }

      // Check roles in order of privilege
      const { data: isSuperAdmin } = await supabase.rpc('has_role', {
        _user_id: session.user.id,
        _role: 'super_admin'
      });

      if (isSuperAdmin) {
        setRole('super_admin');
        setLoading(false);
        return;
      }

      const { data: isAdmin } = await supabase.rpc('has_role', {
        _user_id: session.user.id,
        _role: 'admin'
      });

      if (isAdmin) {
        setRole('admin');
        setLoading(false);
        return;
      }

      const { data: isTeacher } = await supabase.rpc('has_role', {
        _user_id: session.user.id,
        _role: 'teacher'
      });

      if (isTeacher) {
        setRole('teacher');
        setLoading(false);
        return;
      }

      setRole('user');
    } catch (error) {
      console.error('Error checking user role:', error);
      setRole(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkRoles();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkRoles();
    });

    return () => subscription.unsubscribe();
  }, [checkRoles]);

  return { role, loading, isSuperAdmin: role === 'super_admin' };
}
