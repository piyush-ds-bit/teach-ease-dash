import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { generateReceipt, ReceiptData } from "@/lib/pdfGenerator";
import { toast } from "sonner";

type GenerateReceiptButtonProps = {
  studentName: string;
  studentId: string;
  monthlyFee: number;
  totalDue: number;
  joiningDate: string;
  pendingMonths: string[];
};

export const GenerateReceiptButton = ({
  studentName,
  studentId,
  monthlyFee,
  totalDue,
  joiningDate,
  pendingMonths,
}: GenerateReceiptButtonProps) => {
  const handleGenerateReceipt = async () => {
    try {
      const receiptData: ReceiptData = {
        studentName,
        studentId,
        monthlyFee,
        pendingMonths,
        totalDue,
        joiningDate,
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
