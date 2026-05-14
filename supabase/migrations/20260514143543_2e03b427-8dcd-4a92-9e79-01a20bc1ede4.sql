-- Add profile photo to teachers
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS profile_photo_url text;

-- Create private bucket for teacher profile photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('teacher-profiles', 'teacher-profiles', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: each teacher manages their own folder (folder name = auth.uid())
CREATE POLICY "Teachers can view own profile photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'teacher-profiles'
  AND (auth.uid()::text = (storage.foldername(name))[1] OR has_role(auth.uid(), 'admin'::app_role))
);

CREATE POLICY "Teachers can upload own profile photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'teacher-profiles'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Teachers can update own profile photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'teacher-profiles'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Teachers can delete own profile photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'teacher-profiles'
  AND (auth.uid()::text = (storage.foldername(name))[1] OR has_role(auth.uid(), 'admin'::app_role))
);