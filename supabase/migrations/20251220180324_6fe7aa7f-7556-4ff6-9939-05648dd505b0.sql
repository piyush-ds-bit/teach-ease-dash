-- Create enum for interest types
CREATE TYPE public.interest_type AS ENUM ('simple_monthly', 'simple_yearly', 'zero_interest');

-- Create borrowers table
CREATE TABLE public.borrowers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  profile_photo_url TEXT,
  contact_number TEXT,
  principal_amount NUMERIC NOT NULL,
  interest_type interest_type NOT NULL DEFAULT 'zero_interest',
  interest_rate NUMERIC DEFAULT 0,
  loan_start_date DATE NOT NULL,
  duration_months INTEGER,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create lending ledger table
CREATE TABLE public.lending_ledger (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  borrower_id UUID NOT NULL REFERENCES public.borrowers(id) ON DELETE CASCADE,
  entry_type TEXT NOT NULL, -- 'PRINCIPAL', 'INTEREST_ACCRUAL', 'PAYMENT', 'ADJUSTMENT'
  amount NUMERIC NOT NULL,
  description TEXT,
  entry_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS on both tables
ALTER TABLE public.borrowers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lending_ledger ENABLE ROW LEVEL SECURITY;

-- RLS Policies for borrowers (admin only)
CREATE POLICY "Admins can view all borrowers"
ON public.borrowers FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert borrowers"
ON public.borrowers FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update borrowers"
ON public.borrowers FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete borrowers"
ON public.borrowers FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for lending_ledger (admin only)
CREATE POLICY "Admins can view all lending entries"
ON public.lending_ledger FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert lending entries"
ON public.lending_ledger FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update lending entries"
ON public.lending_ledger FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete lending entries"
ON public.lending_ledger FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes for better performance
CREATE INDEX idx_lending_ledger_borrower_id ON public.lending_ledger(borrower_id);
CREATE INDEX idx_lending_ledger_entry_date ON public.lending_ledger(entry_date);