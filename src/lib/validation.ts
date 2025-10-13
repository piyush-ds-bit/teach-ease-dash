import { z } from "zod";

// Student validation schema
export const studentSchema = z.object({
  name: z.string()
    .trim()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters"),
  class: z.string()
    .trim()
    .min(1, "Class is required")
    .max(50, "Class must be less than 50 characters"),
  contact_number: z.string()
    .trim()
    .regex(/^[0-9]{10}$/, "Contact number must be exactly 10 digits"),
  monthly_fee: z.number()
    .positive("Monthly fee must be a positive number")
    .max(1000000, "Monthly fee seems too high")
    .refine((val) => Number.isFinite(val) && /^\d+(\.\d{1,2})?$/.test(val.toString()), {
      message: "Monthly fee can have at most 2 decimal places"
    }),
  joining_date: z.string()
    .refine((date) => {
      const d = new Date(date);
      return d <= new Date() && d >= new Date("2000-01-01");
    }, "Joining date must be between 2000 and today"),
  remarks: z.string()
    .max(500, "Remarks must be less than 500 characters")
    .optional()
});

// Payment validation schema
export const paymentSchema = z.object({
  month: z.string()
    .trim()
    .min(1, "Month is required")
    .max(50, "Month must be less than 50 characters"),
  amount_paid: z.number()
    .positive("Amount must be a positive number")
    .max(1000000, "Amount seems too high")
    .refine((val) => Number.isFinite(val) && /^\d+(\.\d{1,2})?$/.test(val.toString()), {
      message: "Amount can have at most 2 decimal places"
    }),
  payment_date: z.string()
    .refine((date) => {
      const d = new Date(date);
      return d <= new Date() && d >= new Date("2000-01-01");
    }, "Payment date must be between 2000 and today"),
  payment_mode: z.enum(["Cash", "UPI", "Bank Transfer", "Other"], {
    errorMap: () => ({ message: "Invalid payment mode" })
  }),
  transaction_id: z.string()
    .max(100, "Transaction ID must be less than 100 characters")
    .optional()
    .nullable()
});

export type StudentFormData = z.infer<typeof studentSchema>;
export type PaymentFormData = z.infer<typeof paymentSchema>;
