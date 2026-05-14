-- 1. Remove public-read policies on private storage buckets
DROP POLICY IF EXISTS "Anyone can view payment proofs" ON storage.objects;
DROP POLICY IF EXISTS "Public can view payment proofs" ON storage.objects;
DROP POLICY IF EXISTS "Public can view borrower photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view borrower photos" ON storage.objects;

CREATE POLICY "Teachers and admins can view payment proofs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'payment-proofs'
  AND (
    has_role(auth.uid(), 'teacher'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  )
);

CREATE POLICY "Teachers and admins can view borrower photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'borrower-photos'
  AND (
    has_role(auth.uid(), 'teacher'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  )
);

-- 2. user_roles: only admins can insert; add RESTRICTIVE policy as defense in depth
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;

CREATE POLICY "Only admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Block non-admins from role inserts"
ON public.user_roles
AS RESTRICTIVE
FOR INSERT
TO authenticated, anon
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 3. Convert trigger functions to SECURITY INVOKER
CREATE OR REPLACE FUNCTION public.update_user_preferences_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_teachers_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_homework_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 4. Restrict has_role EXECUTE to authenticated users
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;