import { Card, CardContent } from "@/components/ui/card";
import { formatRupees, BorrowerLifetimeSummary as SummaryType } from "@/lib/lendingCalculation";
import { Wallet, ArrowDownLeft, TrendingUp } from "lucide-react";

interface BorrowerLifetimeSummaryProps {
  summary: SummaryType;
}

export function BorrowerLifetimeSummary({ summary }: BorrowerLifetimeSummaryProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Card>
        <CardContent className="flex items-center gap-4 p-4">
          <div className="p-3 rounded-full bg-blue-500/10">
            <Wallet className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Lent</p>
            <p className="text-xl font-bold">{formatRupees(summary.totalLent)}</p>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="flex items-center gap-4 p-4">
          <div className="p-3 rounded-full bg-green-500/10">
            <ArrowDownLeft className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Recovered</p>
            <p className="text-xl font-bold">{formatRupees(summary.totalPaid)}</p>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="flex items-center gap-4 p-4">
          <div className="p-3 rounded-full bg-amber-500/10">
            <TrendingUp className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Outstanding</p>
            <p className={`text-xl font-bold ${summary.totalOutstanding > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatRupees(summary.totalOutstanding)}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
