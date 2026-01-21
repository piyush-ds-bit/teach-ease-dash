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
          
          {/* Admin Routes - Protected by role check */}
          <Route path="/dashboard" element={<ProtectedAdminRoute><Dashboard /></ProtectedAdminRoute>} />
          <Route path="/routine" element={<ProtectedAdminRoute><Routine /></ProtectedAdminRoute>} />
          <Route path="/student/:id" element={<ProtectedAdminRoute><StudentProfile /></ProtectedAdminRoute>} />
          <Route path="/lending" element={<ProtectedAdminRoute><Lending /></ProtectedAdminRoute>} />
          <Route path="/borrower/:id" element={<ProtectedAdminRoute><BorrowerProfile /></ProtectedAdminRoute>} />
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        <CalculatorButton />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
