import { Card } from "@/components/ui/card";
import { formatRupees } from "@/lib/lendingCalculation";
import { Banknote, TrendingUp, CreditCard, Wallet } from "lucide-react";

interface LoanSummaryCardProps {
  principal: number;
  interestAccrued: number;
  totalPaid: number;
  remainingBalance: number;
}

export function LoanSummaryCard({
  principal,
  interestAccrued,
  totalPaid,
  remainingBalance,
}: LoanSummaryCardProps) {
  const cards = [
    {
      label: "Principal",
      value: principal,
      icon: Banknote,
      color: "text-blue-600",
      bgColor: "bg-blue-500/10",
    },
    {
      label: "Interest Accrued",
      value: interestAccrued,
      icon: TrendingUp,
      color: "text-amber-600",
      bgColor: "bg-amber-500/10",
    },
    {
      label: "Total Paid",
      value: totalPaid,
      icon: CreditCard,
      color: "text-green-600",
      bgColor: "bg-green-500/10",
    },
    {
      label: "Remaining Balance",
      value: remainingBalance,
      icon: Wallet,
      color: remainingBalance > 0 ? "text-red-600" : "text-green-600",
      bgColor: remainingBalance > 0 ? "bg-red-500/10" : "bg-green-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.label} className="p-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${card.bgColor}`}>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{card.label}</p>
              <p className={`text-lg font-bold ${card.color}`}>
                {formatRupees(card.value)}
              </p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
