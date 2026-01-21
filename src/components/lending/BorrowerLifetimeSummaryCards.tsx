import { Card, CardContent } from "@/components/ui/card";
import { formatRupees } from "@/lib/lendingCalculation";

interface BorrowerLifetimeSummaryCardsProps {
  totalBorrowed: number;
  totalRecovered: number;
  activeDue: number;
}

export function BorrowerLifetimeSummaryCards({
  totalBorrowed,
  totalRecovered,
  activeDue,
}: BorrowerLifetimeSummaryCardsProps) {
  const items = [
    { label: "Total Borrowed", value: totalBorrowed },
    { label: "Total Recovered", value: totalRecovered },
    { label: "Active Due", value: activeDue },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {items.map((item) => (
        <Card key={item.label}>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">{item.label}</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">{formatRupees(item.value)}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
