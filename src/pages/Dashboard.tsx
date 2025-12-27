import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { StudentsTable } from "@/components/dashboard/StudentsTable";
import { AddStudentDialog } from "@/components/dashboard/AddStudentDialog";

const Dashboard = () => {
  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <DashboardStats />
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Students</h2>
            <p className="text-muted-foreground">Manage your students and track their payments</p>
          </div>
          <AddStudentDialog />
        </div>
        <StudentsTable />
      </main>
    </div>
  );
};

export default Dashboard;
