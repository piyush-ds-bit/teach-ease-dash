import { GraduationCap, LogOut, Calendar, Users, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export const DashboardHeader = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setLoading(false);
    } else {
      navigate("/auth");
    }
  };

  return (
    <TooltipProvider>
      <header className="border-b bg-card shadow-card sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 md:gap-6">
              <Link to="/dashboard" className="flex items-center gap-2 md:gap-3">
                <div className="w-9 h-9 md:w-10 md:h-10 rounded-lg bg-gradient-primary flex items-center justify-center shrink-0">
                  <GraduationCap className="h-5 w-5 md:h-6 md:w-6 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-lg sm:text-xl font-bold">TeachEase</h1>
                  <p className="text-xs sm:text-sm text-muted-foreground">Tuition Management</p>
                </div>
              </Link>
              <nav className="flex gap-1 md:gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link to="/dashboard">
                      <Button 
                        variant={location.pathname === "/dashboard" ? "default" : "ghost"} 
                        size="sm"
                        aria-label="Students"
                        title="Students"
                        className="px-2 md:px-3"
                      >
                        <Users className="h-4 w-4 md:mr-2" />
                        <span className="hidden md:inline">Students</span>
                      </Button>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent className="md:hidden">
                    <p>Students</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link to="/routine">
                      <Button 
                        variant={location.pathname === "/routine" ? "default" : "ghost"} 
                        size="sm"
                        aria-label="Routine"
                        title="Routine"
                        className="px-2 md:px-3"
                      >
                        <Calendar className="h-4 w-4 md:mr-2" />
                        <span className="hidden md:inline">Routine</span>
                      </Button>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent className="md:hidden">
                    <p>Routine</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link to="/lending">
                      <Button 
                        variant={location.pathname.startsWith("/lending") || location.pathname.startsWith("/borrower") ? "default" : "ghost"} 
                        size="sm"
                        aria-label="Lending"
                        title="Lending"
                        className="px-2 md:px-3"
                      >
                        <Wallet className="h-4 w-4 md:mr-2" />
                        <span className="hidden md:inline">Lending</span>
                      </Button>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent className="md:hidden">
                    <p>Lending</p>
                  </TooltipContent>
                </Tooltip>
              </nav>
            </div>
            <AlertDialog>
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm"
                      aria-label="Logout"
                      title="Logout"
                      className="px-2 md:px-3"
                    >
                      <LogOut className="h-4 w-4 md:mr-2" />
                      <span className="hidden md:inline">Logout</span>
                    </Button>
                  </AlertDialogTrigger>
                </TooltipTrigger>
                <TooltipContent className="md:hidden">
                  <p>Logout</p>
                </TooltipContent>
              </Tooltip>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirm Logout</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to logout?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleLogout} disabled={loading}>
                    {loading ? "Logging out..." : "Logout"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </header>
    </TooltipProvider>
  );
};