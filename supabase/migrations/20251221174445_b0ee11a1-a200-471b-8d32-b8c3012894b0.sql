-- Fix 1: Remove the overly permissive routines policy that exposes student names
DROP POLICY IF EXISTS "Anyone can view routines" ON public.routines;

-- Create a new policy allowing authenticated users (including students via service role) to view routines
-- Admins can see routines through their existing policy, students access through service role in edge function
-- Keep the admin-only policy for viewing as the sole policy

-- Fix 2: Make storage buckets private
UPDATE storage.buckets SET public = false WHERE id = 'payment-proofs';
UPDATE storage.buckets SET public = false WHERE id = 'student-photos';
UPDATE storage.buckets SET public = false WHERE id = 'borrower-photos';

-- Remove overly permissive storage policies
DROP POLICY IF EXISTS "Public payment proofs access" ON storage.objects;
DROP POLICY IF EXISTS "Public student photos access" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view student photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view borrower photos" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for borrower-photos" ON storage.objects;

-- Create proper admin-only policies for storage viewing
CREATE POLICY "Admins can view payment proofs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'payment-proofs' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can view student photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'student-photos' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can view borrower photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'borrower-photos' 
  AND has_role(auth.uid(), 'admin'::app_role)
);