-- Super-admin has global teacher management access, consistent with the app access model
DROP POLICY IF EXISTS "Super admins can manage teachers" ON public.teachers;
CREATE POLICY "Super admins can manage teachers"
ON public.teachers
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

-- If a role-bearing account is missing its teacher profile row, allow creating only its own row
DROP POLICY IF EXISTS "Teachers can create own teacher profile" ON public.teachers;
CREATE POLICY "Teachers can create own teacher profile"
ON public.teachers
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND created_by = auth.uid()
  AND status = 'active'::public.teacher_status
  AND (
    profile_photo_url IS NULL
    OR auth.uid()::text = split_part(profile_photo_url, '/', 1)
  )
  AND (
    public.has_role(auth.uid(), 'teacher'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  )
);

-- Prevent regular teachers from changing protected account fields through profile editing
CREATE OR REPLACE FUNCTION public.protect_teacher_account_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() = OLD.user_id
     AND NOT public.has_role(auth.uid(), 'admin'::app_role)
     AND NOT public.has_role(auth.uid(), 'super_admin'::app_role) THEN
    NEW.id := OLD.id;
    NEW.user_id := OLD.user_id;
    NEW.email := OLD.email;
    NEW.status := OLD.status;
    NEW.created_by := OLD.created_by;
    NEW.created_at := OLD.created_at;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_teacher_account_fields_before_update ON public.teachers;
CREATE TRIGGER protect_teacher_account_fields_before_update
BEFORE UPDATE ON public.teachers
FOR EACH ROW
EXECUTE FUNCTION public.protect_teacher_account_fields();