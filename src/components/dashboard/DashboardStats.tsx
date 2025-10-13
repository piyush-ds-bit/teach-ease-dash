import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, DollarSign, AlertCircle } from "lucide-react";

export const DashboardStats = () => {
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalCollected: 0,
    totalPending: 0,
  });

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
      title: "Total Students",
      value: stats.totalStudents,
      icon: Users,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Fees Collected (This Month)",
      value: `₹${stats.totalCollected.toLocaleString()}`,
      icon: DollarSign,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
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
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.title}
            </CardTitle>
            <div className={`p-2 rounded-lg ${stat.bgColor}`}>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
