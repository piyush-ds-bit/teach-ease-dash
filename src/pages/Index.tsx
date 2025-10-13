import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { GraduationCap, TrendingUp, Users, DollarSign } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background">
      <div className="absolute top-4 left-4 sm:top-8 sm:left-8">
        <h2 className="text-xl sm:text-2xl font-semibold text-foreground">Ram Ram Piyush</h2>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center space-y-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-primary shadow-hover">
            <GraduationCap className="h-10 w-10 text-primary-foreground" />
          </div>
          
          <div className="space-y-4">
            <h1 className="text-5xl md:text-6xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              TeachEase Dashboard
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Streamline your tuition management with powerful tools to track students, fees, and payments—all in one place.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button size="lg" onClick={() => navigate("/auth")} className="shadow-hover">
              Get Started
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/auth")}>
              Admin Login
            </Button>
          </div>

          <div className="grid md:grid-cols-3 gap-6 pt-16 max-w-4xl mx-auto">
            <div className="p-6 rounded-xl bg-card shadow-card hover:shadow-hover transition-shadow">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Student Management</h3>
              <p className="text-sm text-muted-foreground">
                Easily add, edit, and track all your students in one organized dashboard
              </p>
            </div>

            <div className="p-6 rounded-xl bg-card shadow-card hover:shadow-hover transition-shadow">
              <div className="w-12 h-12 rounded-lg bg-success/10 flex items-center justify-center mx-auto mb-4">
                <DollarSign className="h-6 w-6 text-success" />
              </div>
              <h3 className="font-semibold mb-2">Payment Tracking</h3>
              <p className="text-sm text-muted-foreground">
                Record payments with proof uploads and keep complete payment history
              </p>
            </div>

            <div className="p-6 rounded-xl bg-card shadow-card hover:shadow-hover transition-shadow">
              <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="h-6 w-6 text-accent" />
              </div>
              <h3 className="font-semibold mb-2">Smart Analytics</h3>
              <p className="text-sm text-muted-foreground">
                Track fees collected, pending amounts, and get insights at a glance
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
