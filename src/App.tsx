import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import StudentProfile from "./pages/StudentProfile";
import Routine from "./pages/Routine";
import NotFound from "./pages/NotFound";
import StudentLogin from "./pages/StudentLogin";
import StudentDashboard from "./pages/StudentDashboard";
import StudentProfileView from "./pages/StudentProfileView";
import StudentPayments from "./pages/StudentPayments";
import StudentRoutineView from "./pages/StudentRoutineView";
import StudentHomework from "./pages/StudentHomework";
import { ProtectedStudentRoute } from "./components/student/ProtectedStudentRoute";
import GenerateCredentials from "./pages/GenerateCredentials";
import { CalculatorButton } from "./components/calculator/CalculatorButton";
import Lending from "./pages/Lending";
import BorrowerProfile from "./pages/BorrowerProfile";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/routine" element={<Routine />} />
          <Route path="/student/:id" element={<StudentProfile />} />
          
          {/* Student Portal Routes */}
          <Route path="/student-login" element={<StudentLogin />} />
          <Route path="/student-dashboard" element={<ProtectedStudentRoute><StudentDashboard /></ProtectedStudentRoute>} />
          <Route path="/student-profile" element={<ProtectedStudentRoute><StudentProfileView /></ProtectedStudentRoute>} />
          <Route path="/student-payments" element={<ProtectedStudentRoute><StudentPayments /></ProtectedStudentRoute>} />
          <Route path="/student-routine" element={<ProtectedStudentRoute><StudentRoutineView /></ProtectedStudentRoute>} />
          <Route path="/student-homework" element={<ProtectedStudentRoute><StudentHomework /></ProtectedStudentRoute>} />
          
          {/* Admin Tools */}
          <Route path="/admin/generate-credentials" element={<GenerateCredentials />} />
          
          {/* Lending Routes */}
          <Route path="/lending" element={<Lending />} />
          <Route path="/borrower/:id" element={<BorrowerProfile />} />
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        <CalculatorButton />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
