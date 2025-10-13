-- Create students table
CREATE TABLE public.students (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  class TEXT NOT NULL,
  contact_number TEXT NOT NULL,
  monthly_fee NUMERIC NOT NULL,
  joining_date DATE NOT NULL,
  remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create payments table
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  amount_paid NUMERIC NOT NULL,
  payment_date DATE NOT NULL,
  payment_mode TEXT NOT NULL,
  transaction_id TEXT,
  proof_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Create admin-only policies for students
CREATE POLICY "Authenticated users can view students"
ON public.students
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert students"
ON public.students
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update students"
ON public.students
FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete students"
ON public.students
FOR DELETE
TO authenticated
USING (true);

-- Create admin-only policies for payments
CREATE POLICY "Authenticated users can view payments"
ON public.payments
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert payments"
ON public.payments
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update payments"
ON public.payments
FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete payments"
ON public.payments
FOR DELETE
TO authenticated
USING (true);

-- Create storage bucket for payment proofs
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', true);

-- Create storage policies
CREATE POLICY "Authenticated users can upload payment proofs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'payment-proofs');

CREATE POLICY "Anyone can view payment proofs"
ON storage.objects
FOR SELECT
USING (bucket_id = 'payment-proofs');

CREATE POLICY "Authenticated users can update payment proofs"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'payment-proofs');

CREATE POLICY "Authenticated users can delete payment proofs"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'payment-proofs');