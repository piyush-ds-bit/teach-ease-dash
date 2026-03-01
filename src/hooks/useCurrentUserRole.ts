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

      // Use has_role RPC (SECURITY DEFINER) in parallel — bypasses restrictive RLS on user_roles
      const [superAdminRes, adminRes, teacherRes] = await Promise.all([
        supabase.rpc('has_role', { _user_id: session.user.id, _role: 'super_admin' }),
        supabase.rpc('has_role', { _user_id: session.user.id, _role: 'admin' }),
        supabase.rpc('has_role', { _user_id: session.user.id, _role: 'teacher' }),
      ]);

      if (superAdminRes.data) {
        setRole('super_admin');
      } else if (adminRes.data) {
        setRole('admin');
      } else if (teacherRes.data) {
        setRole('teacher');
      } else {
        setRole('user');
      }
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
