import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { generateReceipt, ReceiptData } from "@/lib/pdfGenerator";
import { toast } from "sonner";
import { FeeHistoryEntry } from "@/lib/feeHistoryCalculation";

type GenerateReceiptButtonProps = {
  studentName: string;
  studentId: string;
  monthlyFee: number;
  totalDue: number;
  totalPaid: number;
  joiningDate: string;
  pendingMonths: string[];
  subject?: string | null;
  profilePhotoUrl?: string | null;
  pausedMonths?: string[];
  feeHistory?: FeeHistoryEntry[];
};

export const GenerateReceiptButton = ({
  studentName,
  studentId,
  monthlyFee,
  totalDue,
  totalPaid,
  joiningDate,
  pendingMonths,
  subject,
  profilePhotoUrl,
  pausedMonths,
  feeHistory,
}: GenerateReceiptButtonProps) => {
  const handleGenerateReceipt = async () => {
    try {
      const receiptData: ReceiptData = {
        studentName,
        studentId,
        monthlyFee,
        pendingMonths,
        totalDue,
        totalPaid,
        joiningDate,
        subject,
        profilePhotoUrl,
        pausedMonths,
        feeHistory,
      };

      await generateReceipt(receiptData);
      toast.success("Receipt generated and downloaded successfully!");
    } catch (error) {
      console.error("Error generating receipt:", error);
      toast.error("Failed to generate receipt. Please try again.");
    }
  };

  return (
    <Button onClick={handleGenerateReceipt} variant="default" className="gap-2">
      <FileText className="h-4 w-4" />
      Generate Receipt
    </Button>
  );
};
