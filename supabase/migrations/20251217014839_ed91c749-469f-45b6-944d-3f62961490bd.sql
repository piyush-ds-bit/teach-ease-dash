-- Create fee_ledger table for single source of truth
CREATE TABLE public.fee_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('FEE_DUE', 'PAYMENT', 'PAUSE', 'UNPAUSE', 'ADJUSTMENT')),
  month_key TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create index for faster queries
CREATE INDEX idx_fee_ledger_student_id ON public.fee_ledger(student_id);
CREATE INDEX idx_fee_ledger_month_key ON public.fee_ledger(month_key);
CREATE INDEX idx_fee_ledger_entry_type ON public.fee_ledger(entry_type);

-- Enable RLS
ALTER TABLE public.fee_ledger ENABLE ROW LEVEL SECURITY;

-- Admin can do everything
CREATE POLICY "Admins can view all ledger entries"
ON public.fee_ledger
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert ledger entries"
ON public.fee_ledger
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update ledger entries"
ON public.fee_ledger
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete ledger entries"
ON public.fee_ledger
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Students can view their own ledger entries (read-only)
CREATE POLICY "Students can view own ledger entries"
ON public.fee_ledger
FOR SELECT
USING (
  (student_id IN (
    SELECT id FROM public.students 
    WHERE login_id = current_setting('app.current_student_id', true)
  ))
  OR has_role(auth.uid(), 'admin'::app_role)
);