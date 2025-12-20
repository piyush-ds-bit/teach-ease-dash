import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LendingLedgerEntry, formatRupees } from "@/lib/lendingCalculation";
import { format, parseISO } from "date-fns";
import { 
  Banknote, 
  TrendingUp, 
  CreditCard, 
  Settings, 
  Pencil, 
  Trash2 
} from "lucide-react";

interface LendingTimelineProps {
  entries: LendingLedgerEntry[];
  onEditEntry?: (entry: LendingLedgerEntry) => void;
  onDeleteEntry?: (entry: LendingLedgerEntry) => void;
}

const entryConfig = {
  PRINCIPAL: {
    icon: Banknote,
    color: "text-blue-600",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
    label: "Loan Given",
  },
  INTEREST_ACCRUAL: {
    icon: TrendingUp,
    color: "text-amber-600",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
    label: "Interest",
  },
  PAYMENT: {
    icon: CreditCard,
    color: "text-green-600",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/30",
    label: "Payment",
  },
  ADJUSTMENT: {
    icon: Settings,
    color: "text-purple-600",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/30",
    label: "Adjustment",
  },
};

export function LendingTimeline({ 
  entries, 
  onEditEntry, 
  onDeleteEntry 
}: LendingTimelineProps) {
  // Sort entries by date descending
  const sortedEntries = [...entries].sort((a, b) => {
    const dateCompare = new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime();
    if (dateCompare !== 0) return dateCompare;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  if (sortedEntries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Lending Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No ledger entries yet. Add the principal amount to get started.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Lending Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sortedEntries.map((entry) => {
            const config = entryConfig[entry.entry_type as keyof typeof entryConfig];
            const Icon = config.icon;
            const isNegative = entry.entry_type === 'PAYMENT' || entry.amount < 0;
            
            return (
              <div
                key={entry.id}
                className={`flex items-start gap-4 p-3 rounded-lg border ${config.borderColor} ${config.bgColor}`}
              >
                <div className={`p-2 rounded-full ${config.bgColor}`}>
                  <Icon className={`h-4 w-4 ${config.color}`} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">
                      {format(parseISO(entry.entry_date), 'dd MMM yyyy')}
                    </span>
                    <Badge variant="outline" className={`text-xs ${config.color} ${config.borderColor}`}>
                      {config.label}
                    </Badge>
                  </div>
                  {entry.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {entry.description}
                    </p>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <span className={`font-bold whitespace-nowrap ${isNegative ? 'text-green-600' : config.color}`}>
                    {isNegative ? '-' : '+'}{formatRupees(Math.abs(entry.amount))}
                  </span>
                  
                  {(onEditEntry || onDeleteEntry) && entry.entry_type !== 'PRINCIPAL' && (
                    <div className="flex gap-1">
                      {onEditEntry && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => onEditEntry(entry)}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      )}
                      {onDeleteEntry && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => onDeleteEntry(entry)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
