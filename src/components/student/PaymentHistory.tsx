import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

type Payment = {
  id: string;
  month: string;
  amount_paid: number;
  payment_date: string;
  payment_mode: string;
  transaction_id: string | null;
  proof_image_url: string | null;
};

export const PaymentHistory = ({ studentId }: { studentId: string }) => {
  const [payments, setPayments] = useState<Payment[]>([]);

  useEffect(() => {
    loadPayments();
  }, [studentId]);

  const loadPayments = async () => {
    const { data } = await supabase
      .from("payments")
      .select("*")
      .eq("student_id", studentId)
      .order("payment_date", { ascending: false });
    
    setPayments(data || []);
  };

  return (
    <Card className="shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Month
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Mode
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Transaction ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Proof
              </th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-border">
            {payments.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                  No payment records found
                </td>
              </tr>
            ) : (
              payments.map((payment) => (
                <tr key={payment.id} className="hover:bg-muted/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap font-medium">
                    {payment.month}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-semibold text-success">
                    ₹{payment.amount_paid.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">
                    {new Date(payment.payment_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant="secondary">{payment.payment_mode}</Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">
                    {payment.transaction_id || "—"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {payment.proof_image_url ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(payment.proof_image_url!, "_blank")}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
};
