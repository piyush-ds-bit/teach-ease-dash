-- Make payment-proofs bucket private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'payment-proofs';

-- Create RLS policies for payment-proofs bucket
-- Policy: Only admins can insert payment proofs
CREATE POLICY "Only admins can upload payment proofs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'payment-proofs' AND
  public.has_role(auth.uid(), 'admin'::app_role)
);

-- Policy: Only admins can view payment proofs
CREATE POLICY "Only admins can view payment proofs"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'payment-proofs' AND
  public.has_role(auth.uid(), 'admin'::app_role)
);

-- Policy: Only admins can update payment proofs
CREATE POLICY "Only admins can update payment proofs"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'payment-proofs' AND
  public.has_role(auth.uid(), 'admin'::app_role)
);

-- Policy: Only admins can delete payment proofs
CREATE POLICY "Only admins can delete payment proofs"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'payment-proofs' AND
  public.has_role(auth.uid(), 'admin'::app_role)
);