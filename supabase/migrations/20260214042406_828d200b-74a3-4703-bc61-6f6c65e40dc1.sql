-- Fix storage buckets: make student-photos and borrower-photos private
UPDATE storage.buckets SET public = false WHERE id IN ('student-photos', 'borrower-photos');

-- Drop existing admin-only upload/update/delete policies and recreate for teachers+admins

-- PAYMENT-PROOFS bucket
DROP POLICY IF EXISTS "Admins can upload payment proofs" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update payment proofs" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete payment proofs" ON storage.objects;

CREATE POLICY "Teachers/admins can upload payment proofs"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'payment-proofs'
  AND (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);

CREATE POLICY "Teachers/admins can update payment proofs"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'payment-proofs'
  AND (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);

CREATE POLICY "Teachers/admins can delete payment proofs"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'payment-proofs'
  AND (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);

-- STUDENT-PHOTOS bucket
DROP POLICY IF EXISTS "Admins can upload student photos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update student photos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete student photos" ON storage.objects;

CREATE POLICY "Teachers/admins can upload student photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'student-photos'
  AND (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);

CREATE POLICY "Teachers/admins can update student photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'student-photos'
  AND (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);

CREATE POLICY "Teachers/admins can delete student photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'student-photos'
  AND (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);

-- BORROWER-PHOTOS bucket
DROP POLICY IF EXISTS "Admins can upload borrower photos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update borrower photos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete borrower photos" ON storage.objects;

CREATE POLICY "Teachers/admins can upload borrower photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'borrower-photos'
  AND (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);

CREATE POLICY "Teachers/admins can update borrower photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'borrower-photos'
  AND (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);

CREATE POLICY "Teachers/admins can delete borrower photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'borrower-photos'
  AND (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);