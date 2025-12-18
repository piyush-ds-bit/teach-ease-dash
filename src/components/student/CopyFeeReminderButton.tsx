import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { formatMonthKey, getPartialDueInfo } from "@/lib/feeCalculation";

interface CopyFeeReminderButtonProps {
  studentName: string;
  pendingMonths: string[];
  totalDue: number;
  monthlyFee?: number;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
}

export const CopyFeeReminderButton = ({
  studentName,
  pendingMonths,
  totalDue,
  monthlyFee = 0,
  variant = "outline",
  size = "default",
}: CopyFeeReminderButtonProps) => {
  const [copied, setCopied] = useState(false);

  const formatPendingMonthsText = (months: string[]): string => {
    if (months.length === 0) return "";
    if (months.length === 1) return formatMonthKey(months[0]);
    
    // Sort months chronologically
    const sortedMonths = [...months].sort();
    
    // Format each month
    const formattedMonths = sortedMonths.map(m => {
      const [year, month] = m.split('-').map(Number);
      const date = new Date(year, month - 1);
      return date.toLocaleDateString('en-IN', { month: 'long' });
    });
    
    // Join with commas and "and" for last item
    if (formattedMonths.length === 2) {
      return `${formattedMonths[0]} and ${formattedMonths[1]}`;
    }
    
    const lastMonth = formattedMonths.pop();
    return `${formattedMonths.join(', ')} and ${lastMonth}`;
  };

  const generateMessage = (): string => {
    const amountText = `₹${totalDue.toLocaleString('en-IN')}`;
    
    // Handle partial due in message
    if (monthlyFee > 0 && totalDue > 0) {
      const partialInfo = getPartialDueInfo(totalDue, monthlyFee, pendingMonths);
      
      if (partialInfo.isPartial && partialInfo.fullDueMonths.length === 0) {
        // Only partial due
        return `Ram Ram ji,
${amountText} partial fee is pending for ${partialInfo.partialMonth}.
Please let me know once paid.
– Piyush Bhaiya`;
      } else if (partialInfo.isPartial && partialInfo.fullDueMonths.length > 0) {
        // Full months + partial
        const fullMonthsText = partialInfo.fullDueMonths.length === 1 
          ? partialInfo.fullDueMonths[0]
          : partialInfo.fullDueMonths.slice(0, -1).join(', ') + ' and ' + partialInfo.fullDueMonths.slice(-1);
        return `Ram Ram ji,
${amountText} fee is pending for ${fullMonthsText} + partial for ${partialInfo.partialMonth}.
Please let me know once paid.
– Piyush Bhaiya`;
      }
    }
    
    // Default: full months only
    const monthsText = formatPendingMonthsText(pendingMonths);
    return `Ram Ram ji,
${amountText} fee is pending for ${monthsText}.
Please let me know once paid.
– Piyush Bhaiya`;
  };

  const handleCopy = async () => {
    if (totalDue <= 0) {
      toast.info("No pending fees to remind about");
      return;
    }

    try {
      const message = generateMessage();
      await navigator.clipboard.writeText(message);
      setCopied(true);
      toast.success("Message copied to clipboard!");
      
      // Reset copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
      toast.error("Failed to copy message");
    }
  };

  const isDisabled = totalDue <= 0;

  return (
    <Button
      onClick={handleCopy}
      variant={variant}
      size={size}
      disabled={isDisabled}
      className="gap-2"
      title={isDisabled ? "No pending fees" : "Copy fee reminder message"}
    >
      {copied ? (
        <Check className="h-4 w-4" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
      {size !== "icon" && (copied ? "Copied!" : "Copy Reminder")}
    </Button>
  );
};
