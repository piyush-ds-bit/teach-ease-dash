-- Add profile_photo_url column to students table
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS profile_photo_url text;

COMMENT ON COLUMN students.profile_photo_url IS 'URL to student profile photo stored in Supabase Storage';

-- Create student-photos bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'student-photos',
  'student-photos',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- RLS Policy: Allow authenticated admins to upload photos
CREATE POLICY "Admins can upload student photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'student-photos' AND
  (SELECT has_role(auth.uid(), 'admin'::app_role))
);

-- RLS Policy: Allow authenticated admins to update photos
CREATE POLICY "Admins can update student photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'student-photos' AND
  (SELECT has_role(auth.uid(), 'admin'::app_role))
);

-- RLS Policy: Allow authenticated admins to delete photos
CREATE POLICY "Admins can delete student photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'student-photos' AND
  (SELECT has_role(auth.uid(), 'admin'::app_role))
);

-- RLS Policy: Anyone can view photos (bucket is public)
CREATE POLICY "Public can view student photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'student-photos');