import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, DollarSign, AlertCircle, Eye, EyeOff } from "lucide-react";

export const DashboardStats = () => {
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalCollected: 0,
    totalPending: 0,
  });

  const [visibility, setVisibility] = useState({
    totalStudents: true,
    feesCollected: true,
    pendingFees: true,
  });

  const toggleVisibility = (key: keyof typeof visibility) => {
    setVisibility(prev => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const { data: students } = await supabase.from("students").select("*");
    const { data: payments } = await supabase.from("payments").select("*");

    const currentMonth = new Date().toLocaleString("default", { month: "long", year: "numeric" });
    const monthlyPayments = payments?.filter((p) => p.month === currentMonth) || [];
    const totalCollected = monthlyPayments.reduce((sum, p) => sum + Number(p.amount_paid), 0);

    const totalMonthlyFees = students?.reduce((sum, s) => sum + Number(s.monthly_fee), 0) || 0;
    const totalPending = totalMonthlyFees - totalCollected;

    setStats({
      totalStudents: students?.length || 0,
      totalCollected,
      totalPending: Math.max(0, totalPending),
    });
  };

  const statCards = [
    {
      key: "totalStudents" as const,
      title: "Total Students",
      value: stats.totalStudents,
      icon: Users,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      key: "feesCollected" as const,
      title: "Fees Collected (This Month)",
      value: `₹${stats.totalCollected.toLocaleString()}`,
      icon: DollarSign,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      key: "pendingFees" as const,
      title: "Pending Fees",
      value: `₹${stats.totalPending.toLocaleString()}`,
      icon: AlertCircle,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {statCards.map((stat) => (
        <Card key={stat.title} className="shadow-card hover:shadow-hover transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center justify-between w-full">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => toggleVisibility(stat.key)}
                  aria-label="Toggle visibility"
                >
                  {visibility[stat.key] ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4" />
                  )}
                </Button>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold transition-all duration-300 ${!visibility[stat.key] ? 'blur-md select-none' : ''}`}>
              {visibility[stat.key] ? stat.value : '••••••'}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
