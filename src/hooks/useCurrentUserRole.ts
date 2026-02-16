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

      // Single query instead of 3 sequential RPC calls
      const { data: roles, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id);

      if (error || !roles || roles.length === 0) {
        setRole('user');
        setLoading(false);
        return;
      }

      const roleSet = new Set(roles.map(r => r.role));

      if (roleSet.has('super_admin')) {
        setRole('super_admin');
      } else if (roleSet.has('admin')) {
        setRole('admin');
      } else if (roleSet.has('teacher')) {
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
