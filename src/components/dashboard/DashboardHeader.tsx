import { Calendar, Users, Wallet } from "lucide-react";
import vidyaSyncLogo from "@/assets/vidyasync-logo.png";
import { Button } from "@/components/ui/button";
import { useLocation, Link } from "react-router-dom";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TeacherProfileMenu } from "@/components/profile/TeacherProfileMenu";

export const DashboardHeader = () => {
  const location = useLocation();

  return (
    <TooltipProvider>
      <header className="border-b bg-card shadow-card sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 md:gap-6">
              <Link to="/dashboard" className="flex items-center gap-2 md:gap-3">
                <img
                  src={vidyaSyncLogo}
                  alt="VidyaSync logo"
                  className="h-9 w-9 md:h-10 md:w-10 object-contain shrink-0"
                />
                <div className="hidden sm:block">
                  <h1 className="text-lg sm:text-xl font-bold tracking-tight">VidyaSync</h1>
                  <p className="text-xs text-muted-foreground">Seekho • Sync Karo • Grow Karo</p>
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
                        variant={
                          location.pathname.startsWith("/lending") ||
                          location.pathname.startsWith("/borrower")
                            ? "default"
                            : "ghost"
                        }
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
            <TeacherProfileMenu />
          </div>
        </div>
      </header>
    </TooltipProvider>
  );
};
