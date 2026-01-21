-- Teacher directory for invite-only accounts

-- 1) Status enum
DO $$ BEGIN
  CREATE TYPE public.teacher_status AS ENUM ('active', 'suspended');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2) Teachers table
CREATE TABLE IF NOT EXISTS public.teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  email text NOT NULL UNIQUE,
  full_name text NOT NULL,
  phone text,
  status public.teacher_status NOT NULL DEFAULT 'active',
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_teachers_user_id ON public.teachers(user_id);
CREATE INDEX IF NOT EXISTS idx_teachers_status ON public.teachers(status);

-- 3) RLS
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;

-- Admins manage all teacher accounts
DROP POLICY IF EXISTS "Admins can manage teachers" ON public.teachers;
CREATE POLICY "Admins can manage teachers"
ON public.teachers
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Teachers can view their own row (for status checks)
DROP POLICY IF EXISTS "Teachers can view own teacher row" ON public.teachers;
CREATE POLICY "Teachers can view own teacher row"
ON public.teachers
FOR SELECT
USING (
  (user_id = auth.uid()) AND (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);

-- 4) updated_at trigger
CREATE OR REPLACE FUNCTION public.update_teachers_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_teachers_updated_at ON public.teachers;
CREATE TRIGGER update_teachers_updated_at
BEFORE UPDATE ON public.teachers
FOR EACH ROW
EXECUTE FUNCTION public.update_teachers_updated_at();
