import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { BorrowersTable } from "@/components/lending/BorrowersTable";

export default function Lending() {
  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Personal Lending</h1>
          <p className="text-muted-foreground">Track money you've lent to others</p>
        </div>
        <BorrowersTable />
      </main>
    </div>
  );
}
