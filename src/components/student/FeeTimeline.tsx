import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LedgerEntry, formatMonthKey } from "@/lib/ledgerCalculation";
import { 
  Calendar, 
  CreditCard, 
  PauseCircle, 
  PlayCircle, 
  AlertCircle,
  TrendingDown,
  TrendingUp,
  AlertTriangle
} from "lucide-react";

interface FeeTimelineProps {
  entries: LedgerEntry[];
  loading?: boolean;
  monthlyFee?: number;
}

const getEntryIcon = (type: LedgerEntry['entry_type']) => {
  switch (type) {
    case 'FEE_DUE':
      return <Calendar className="h-4 w-4" />;
    case 'PAYMENT':
      return <CreditCard className="h-4 w-4" />;
    case 'PAUSE':
      return <PauseCircle className="h-4 w-4" />;
    case 'UNPAUSE':
      return <PlayCircle className="h-4 w-4" />;
    case 'ADJUSTMENT':
      return <AlertCircle className="h-4 w-4" />;
    default:
      return <Calendar className="h-4 w-4" />;
  }
};

const getEntryStyles = (type: LedgerEntry['entry_type']) => {
  switch (type) {
    case 'FEE_DUE':
      return {
        badge: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
        icon: 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400',
        line: 'bg-rose-200 dark:bg-rose-800',
      };
    case 'PAYMENT':
      return {
        badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
        icon: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
        line: 'bg-emerald-200 dark:bg-emerald-800',
      };
    case 'PAUSE':
      return {
        badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
        icon: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
        line: 'bg-amber-200 dark:bg-amber-800',
      };
    case 'UNPAUSE':
      return {
        badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        icon: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
        line: 'bg-blue-200 dark:bg-blue-800',
      };
    case 'ADJUSTMENT':
      return {
        badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
        icon: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
        line: 'bg-purple-200 dark:bg-purple-800',
      };
    default:
      return {
        badge: 'bg-muted text-muted-foreground',
        icon: 'bg-muted text-muted-foreground',
        line: 'bg-muted',
      };
  }
};

const getEntryLabel = (type: LedgerEntry['entry_type']) => {
  switch (type) {
    case 'FEE_DUE':
      return 'Fee Due';
    case 'PAYMENT':
      return 'Payment';
    case 'PAUSE':
      return 'Paused';
    case 'UNPAUSE':
      return 'Resumed';
    case 'ADJUSTMENT':
      return 'Adjustment';
    default:
      return type;
  }
};

export const FeeTimeline = ({ entries, loading, monthlyFee = 0 }: FeeTimelineProps) => {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Fee Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (entries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Fee Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No ledger entries yet. Fee entries will appear here as months complete.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Sort entries by month_key descending (most recent first)
  const sortedEntries = [...entries].sort((a, b) => {
    if (a.month_key !== b.month_key) {
      return b.month_key.localeCompare(a.month_key);
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  // Calculate running balance and per-month balances
  let runningBalance = 0;
  const monthBalances: Record<string, number> = {};
  
  // First pass: calculate balances per month (chronological order)
  const chronoEntries = [...sortedEntries].reverse();
  chronoEntries.forEach(entry => {
    const monthKey = entry.month_key;
    if (!monthBalances[monthKey]) {
      monthBalances[monthKey] = 0;
    }
    
    if (entry.entry_type === 'FEE_DUE') {
      monthBalances[monthKey] += Number(entry.amount);
      runningBalance += Number(entry.amount);
    } else if (entry.entry_type === 'PAYMENT') {
      monthBalances[monthKey] -= Number(entry.amount);
      runningBalance -= Number(entry.amount);
    }
  });

  // Second pass: add running balances to entries
  runningBalance = 0;
  const entriesWithBalance = chronoEntries.map(entry => {
    if (entry.entry_type === 'FEE_DUE') {
      runningBalance += Number(entry.amount);
    } else if (entry.entry_type === 'PAYMENT') {
      runningBalance -= Number(entry.amount);
    }
    return { ...entry, runningBalance };
  });

  // Re-reverse for display (most recent first)
  const displayEntries = [...entriesWithBalance].reverse();

  // Determine which months have partial dues
  const getMonthStatus = (monthKey: string, balance: number) => {
    const monthBal = monthBalances[monthKey] || 0;
    if (monthBal <= 0) return 'paid';
    if (monthlyFee > 0 && monthBal < monthlyFee) return 'partial';
    return 'due';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Fee Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="relative">
            {displayEntries.map((entry, index) => {
              const styles = getEntryStyles(entry.entry_type);
              const isLast = index === displayEntries.length - 1;
              const monthStatus = getMonthStatus(entry.month_key, entry.runningBalance);
              const isPartialMonth = monthStatus === 'partial' && entry.entry_type === 'FEE_DUE';
              const partialAmount = monthlyFee > 0 ? monthBalances[entry.month_key] || 0 : 0;
              
              return (
                <div key={entry.id} className="relative pl-8 pb-6">
                  {/* Vertical line */}
                  {!isLast && (
                    <div 
                      className={`absolute left-[15px] top-8 bottom-0 w-0.5 ${styles.line}`} 
                    />
                  )}
                  
                  {/* Icon */}
                  <div 
                    className={`absolute left-0 top-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      isPartialMonth 
                        ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' 
                        : styles.icon
                    }`}
                  >
                    {isPartialMonth ? <AlertTriangle className="h-4 w-4" /> : getEntryIcon(entry.entry_type)}
                  </div>
                  
                  {/* Content */}
                  <div className="bg-card border rounded-lg p-3 ml-2">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className={
                          isPartialMonth 
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' 
                            : styles.badge
                        }>
                          {isPartialMonth ? 'Partial Due' : getEntryLabel(entry.entry_type)}
                        </Badge>
                        {isPartialMonth && (
                          <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                            ₹{partialAmount.toLocaleString('en-IN')} remaining
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatMonthKey(entry.month_key)}
                      </span>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-2">
                      {entry.description}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      {entry.amount > 0 && (
                        <span className={`font-semibold flex items-center gap-1 ${
                          entry.entry_type === 'PAYMENT' 
                            ? 'text-emerald-600 dark:text-emerald-400' 
                            : isPartialMonth
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-rose-600 dark:text-rose-400'
                        }`}>
                          {entry.entry_type === 'PAYMENT' ? (
                            <TrendingDown className="h-3 w-3" />
                          ) : isPartialMonth ? (
                            <AlertTriangle className="h-3 w-3" />
                          ) : (
                            <TrendingUp className="h-3 w-3" />
                          )}
                          ₹{Number(entry.amount).toLocaleString('en-IN')}
                        </span>
                      )}
                      
                      <span className={`text-xs ${
                        entry.runningBalance > 0 
                          ? 'text-rose-600 dark:text-rose-400' 
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}>
                        Balance: ₹{entry.runningBalance.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
