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
import { getStudentSession } from "@/lib/studentAuth";
import { AdminCalculator } from "./AdminCalculator";

export function CalculatorButton() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const studentSession = getStudentSession();
      // Admin = has Supabase auth session AND no student session
      setIsAdmin(!!session && !studentSession);
    };

    checkAdmin();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      const studentSession = getStudentSession();
      setIsAdmin(!!session && !studentSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Don't render for non-admins
  if (!isAdmin) return null;

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
