-- Ensure teacher profile photos are stored in a private bucket
UPDATE storage.buckets
SET public = false
WHERE id = 'teacher-profiles';

-- Let teachers update only their own profile row, while preserving admin management
DROP POLICY IF EXISTS "Teachers can update own teacher profile" ON public.teachers;
CREATE POLICY "Teachers can update own teacher profile"
ON public.teachers
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()
  AND (
    public.has_role(auth.uid(), 'teacher'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  )
)
WITH CHECK (
  user_id = auth.uid()
  AND (
    public.has_role(auth.uid(), 'teacher'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  )
);

-- Ensure super-admin can also view teacher rows where needed
DROP POLICY IF EXISTS "Super admins can view teacher rows" ON public.teachers;
CREATE POLICY "Super admins can view teacher rows"
ON public.teachers
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::app_role));

-- Recreate teacher profile storage policies idempotently
DROP POLICY IF EXISTS "Teachers can view own profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Teachers can upload own profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Teachers can update own profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Teachers can delete own profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage teacher profile photos" ON storage.objects;

CREATE POLICY "Teachers can view own profile photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'teacher-profiles'
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND (
    public.has_role(auth.uid(), 'teacher'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  )
);

CREATE POLICY "Teachers can upload own profile photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'teacher-profiles'
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND (
    public.has_role(auth.uid(), 'teacher'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  )
);

CREATE POLICY "Teachers can update own profile photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'teacher-profiles'
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND (
    public.has_role(auth.uid(), 'teacher'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  )
)
WITH CHECK (
  bucket_id = 'teacher-profiles'
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND (
    public.has_role(auth.uid(), 'teacher'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  )
);

CREATE POLICY "Teachers can delete own profile photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'teacher-profiles'
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND (
    public.has_role(auth.uid(), 'teacher'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  )
);

CREATE POLICY "Admins can manage teacher profile photos"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'teacher-profiles'
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  )
)
WITH CHECK (
  bucket_id = 'teacher-profiles'
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  )
);