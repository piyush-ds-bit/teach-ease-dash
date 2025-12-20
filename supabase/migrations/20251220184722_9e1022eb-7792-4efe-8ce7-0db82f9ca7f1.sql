-- Create storage bucket for borrower photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('borrower-photos', 'borrower-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload borrower photos
CREATE POLICY "Admins can upload borrower photos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'borrower-photos' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Allow public read access
CREATE POLICY "Public can view borrower photos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'borrower-photos');

-- Allow admins to update borrower photos
CREATE POLICY "Admins can update borrower photos"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'borrower-photos' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Allow admins to delete borrower photos
CREATE POLICY "Admins can delete borrower photos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'borrower-photos' 
  AND has_role(auth.uid(), 'admin'::app_role)
);