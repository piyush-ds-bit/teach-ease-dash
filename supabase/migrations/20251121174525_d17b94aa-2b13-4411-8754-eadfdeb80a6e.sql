-- Add student authentication columns
ALTER TABLE public.students
ADD COLUMN IF NOT EXISTS login_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS password_hash TEXT;

CREATE INDEX IF NOT EXISTS idx_students_login_id ON public.students(login_id);

-- Create homework table
CREATE TABLE IF NOT EXISTS public.homework (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  due_date DATE NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_homework_student_id ON public.homework(student_id);
CREATE INDEX IF NOT EXISTS idx_homework_due_date ON public.homework(due_date);

-- Enable RLS on homework table
ALTER TABLE public.homework ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Students can view own profile" ON public.students;
DROP POLICY IF EXISTS "Students can view own payments" ON public.payments;
DROP POLICY IF EXISTS "Anyone can view routines" ON public.routines;

-- Students table RLS: Students can view their own record
CREATE POLICY "Students can view own profile"
ON public.students FOR SELECT
TO public
USING (
  login_id = current_setting('app.current_student_id', true)
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Payments table RLS: Students can view their own payments
CREATE POLICY "Students can view own payments"
ON public.payments FOR SELECT
TO public
USING (
  student_id IN (
    SELECT id FROM public.students 
    WHERE login_id = current_setting('app.current_student_id', true)
  )
  OR EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
);

-- Routines table RLS: Everyone can view routines (shared schedule)
CREATE POLICY "Anyone can view routines"
ON public.routines FOR SELECT
TO public
USING (true);

-- Homework table RLS policies
CREATE POLICY "Students can view own homework"
ON public.homework FOR SELECT
TO public
USING (
  student_id IN (
    SELECT id FROM public.students 
    WHERE login_id = current_setting('app.current_student_id', true)
  )
  OR EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
);

CREATE POLICY "Admins can insert homework"
ON public.homework FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update homework"
ON public.homework FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete homework"
ON public.homework FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for homework updated_at
CREATE OR REPLACE FUNCTION update_homework_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_homework_updated_at_trigger ON public.homework;
CREATE TRIGGER update_homework_updated_at_trigger
BEFORE UPDATE ON public.homework
FOR EACH ROW
EXECUTE FUNCTION update_homework_updated_at();