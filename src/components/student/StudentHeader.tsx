import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, GraduationCap } from "lucide-react";
import { getStudentSession, clearStudentSession } from "@/lib/studentAuth";
import { toast } from "@/hooks/use-toast";

export const StudentHeader = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const session = getStudentSession();

  const handleLogout = () => {
    clearStudentSession();
    toast({
      title: "Logged out successfully",
      description: "You have been logged out of your account.",
    });
    navigate("/student-login");
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to="/student-dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <GraduationCap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-semibold">Student Portal</span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-1">
            <Link to="/student-dashboard">
              <Button variant={isActive("/student-dashboard") ? "secondary" : "ghost"} size="sm">
                Dashboard
              </Button>
            </Link>
            <Link to="/student-profile">
              <Button variant={isActive("/student-profile") ? "secondary" : "ghost"} size="sm">
                Profile
              </Button>
            </Link>
            <Link to="/student-payments">
              <Button variant={isActive("/student-payments") ? "secondary" : "ghost"} size="sm">
                Payments
              </Button>
            </Link>
            <Link to="/student-routine">
              <Button variant={isActive("/student-routine") ? "secondary" : "ghost"} size="sm">
                Routine
              </Button>
            </Link>
            <Link to="/student-homework">
              <Button variant={isActive("/student-homework") ? "secondary" : "ghost"} size="sm">
                Homework
              </Button>
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src="" />
              <AvatarFallback>{session?.name?.charAt(0) || "S"}</AvatarFallback>
            </Avatar>
            <span className="hidden sm:inline-block text-sm font-medium">
              {session?.name || "Student"}
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
};
