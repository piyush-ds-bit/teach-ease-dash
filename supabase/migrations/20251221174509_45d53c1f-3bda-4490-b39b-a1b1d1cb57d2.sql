-- Add auth_user_id column to students table for proper Supabase Auth integration
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_students_auth_user_id ON public.students(auth_user_id);

-- Update RLS policies to use auth.uid() instead of current_setting
-- Drop old student-view policies that use current_setting
DROP POLICY IF EXISTS "Students can view own profile" ON public.students;
DROP POLICY IF EXISTS "Students can view own ledger entries" ON public.fee_ledger;
DROP POLICY IF EXISTS "Students can view own homework" ON public.homework;
DROP POLICY IF EXISTS "Students can view own payments" ON public.payments;

-- Create new policies using auth.uid() with auth_user_id
CREATE POLICY "Students can view own profile"
ON public.students FOR SELECT
USING (
  auth_user_id = auth.uid() 
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Students can view own ledger entries"
ON public.fee_ledger FOR SELECT
USING (
  student_id IN (SELECT id FROM students WHERE auth_user_id = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Students can view own homework"
ON public.homework FOR SELECT
USING (
  student_id IN (SELECT id FROM students WHERE auth_user_id = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Students can view own payments"
ON public.payments FOR SELECT
USING (
  student_id IN (SELECT id FROM students WHERE auth_user_id = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Also allow authenticated users to view routines (students need to see their schedule)
CREATE POLICY "Authenticated users can view routines"
ON public.routines FOR SELECT
USING (auth.role() = 'authenticated');