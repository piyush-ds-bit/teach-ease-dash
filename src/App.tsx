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
import { ProtectedAdminRoute } from "./components/admin/ProtectedAdminRoute";
import { ProtectedSuperAdminRoute } from "./components/admin/ProtectedSuperAdminRoute";
import { CalculatorButton } from "./components/calculator/CalculatorButton";
import { SuperAdminFAB } from "./components/admin/SuperAdminFAB";
import Lending from "./pages/Lending";
import BorrowerProfile from "./pages/BorrowerProfile";
import TeacherManagement from "./pages/TeacherManagement";
import ResetPassword from "./pages/ResetPassword";
import AuthCallback from "./pages/AuthCallback";
import SetPassword from "./pages/SetPassword";

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
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/set-password" element={<SetPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          
          {/* Admin Routes - Protected by role check */}
          <Route path="/dashboard" element={<ProtectedAdminRoute><Dashboard /></ProtectedAdminRoute>} />
          <Route path="/routine" element={<ProtectedAdminRoute><Routine /></ProtectedAdminRoute>} />
          <Route path="/student/:id" element={<ProtectedAdminRoute><StudentProfile /></ProtectedAdminRoute>} />
          <Route path="/lending" element={<ProtectedAdminRoute><Lending /></ProtectedAdminRoute>} />
          <Route path="/borrower/:id" element={<ProtectedAdminRoute><BorrowerProfile /></ProtectedAdminRoute>} />
          
          {/* Super Admin Routes */}
          <Route path="/super-admin/teachers" element={<ProtectedSuperAdminRoute><TeacherManagement /></ProtectedSuperAdminRoute>} />
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        <CalculatorButton />
        <SuperAdminFAB />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
