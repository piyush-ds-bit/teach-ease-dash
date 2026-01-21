import { useState, useEffect } from "react";
import { Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { supabase } from "@/integrations/supabase/client";
import { AdminCalculator } from "./AdminCalculator";

export function CalculatorButton() {
  const [isAllowed, setIsAllowed] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const checkAccess = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setIsAllowed(false);
        return;
      }

      // Calculator is available only to authenticated teachers/admins
      const [{ data: isAdmin }, { data: isTeacher }] = await Promise.all([
        supabase.rpc("has_role", { _user_id: session.user.id, _role: "admin" }),
        supabase.rpc("has_role", { _user_id: session.user.id, _role: "teacher" }),
      ]);

      setIsAllowed(Boolean(isAdmin || isTeacher));
    };

    checkAccess();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (!session) {
        setIsAllowed(false);
        return;
      }
      checkAccess();
    });

    return () => subscription.unsubscribe();
  }, []);

  // Don't render for non-teachers/admins
  if (!isAllowed) return null;

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button
          size="icon"
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
        >
          <Calculator className="h-6 w-6" />
        </Button>
      </DrawerTrigger>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Calculator
          </DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-6 overflow-auto">
          <AdminCalculator />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
