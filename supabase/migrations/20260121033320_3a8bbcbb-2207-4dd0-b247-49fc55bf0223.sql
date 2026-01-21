-- Set stable search_path on mutable function (linter warn)
CREATE OR REPLACE FUNCTION public.update_user_preferences_updated_at()
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

-- Drop student-access policies that depend on students.auth_user_id
DROP POLICY IF EXISTS "Students can view own profile" ON public.students;
DROP POLICY IF EXISTS "Students can view own ledger entries" ON public.fee_ledger;
DROP POLICY IF EXISTS "Students can view own homework" ON public.homework;
DROP POLICY IF EXISTS "Students can view own payments" ON public.payments;

-- Students are data records only: remove auth + credential columns
ALTER TABLE public.students
  DROP COLUMN IF EXISTS login_id,
  DROP COLUMN IF EXISTS password_hash,
  DROP COLUMN IF EXISTS auth_user_id;

-- Ownership: add teacher_id to all teacher-owned tables
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS teacher_id uuid;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS teacher_id uuid;
ALTER TABLE public.fee_ledger ADD COLUMN IF NOT EXISTS teacher_id uuid;
ALTER TABLE public.homework ADD COLUMN IF NOT EXISTS teacher_id uuid;
ALTER TABLE public.routines ADD COLUMN IF NOT EXISTS teacher_id uuid;
ALTER TABLE public.borrowers ADD COLUMN IF NOT EXISTS teacher_id uuid;
ALTER TABLE public.lending_ledger ADD COLUMN IF NOT EXISTS teacher_id uuid;

CREATE INDEX IF NOT EXISTS idx_students_teacher_id ON public.students(teacher_id);
CREATE INDEX IF NOT EXISTS idx_payments_teacher_id ON public.payments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_fee_ledger_teacher_id ON public.fee_ledger(teacher_id);
CREATE INDEX IF NOT EXISTS idx_homework_teacher_id ON public.homework(teacher_id);
CREATE INDEX IF NOT EXISTS idx_routines_teacher_id ON public.routines(teacher_id);
CREATE INDEX IF NOT EXISTS idx_borrowers_teacher_id ON public.borrowers(teacher_id);
CREATE INDEX IF NOT EXISTS idx_lending_ledger_teacher_id ON public.lending_ledger(teacher_id);

-- Replace admin-only policies with teacher-owned policies (admin sees all)
-- Students
DROP POLICY IF EXISTS "Only admins can view students" ON public.students;
DROP POLICY IF EXISTS "Only admins can insert students" ON public.students;
DROP POLICY IF EXISTS "Only admins can update students" ON public.students;
DROP POLICY IF EXISTS "Only admins can delete students" ON public.students;

CREATE POLICY "Teachers/admins can view own students"
ON public.students
FOR SELECT
USING (
  (teacher_id = auth.uid() AND (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role)))
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Teachers/admins can insert own students"
ON public.students
FOR INSERT
WITH CHECK (
  teacher_id = auth.uid() AND (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);

CREATE POLICY "Teachers/admins can update own students"
ON public.students
FOR UPDATE
USING (
  (teacher_id = auth.uid() AND (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role)))
  OR has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  (teacher_id = auth.uid() AND (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role)))
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Teachers/admins can delete own students"
ON public.students
FOR DELETE
USING (
  (teacher_id = auth.uid() AND (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role)))
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Payments
DROP POLICY IF EXISTS "Only admins can view payments" ON public.payments;
DROP POLICY IF EXISTS "Only admins can insert payments" ON public.payments;
DROP POLICY IF EXISTS "Only admins can update payments" ON public.payments;
DROP POLICY IF EXISTS "Only admins can delete payments" ON public.payments;

CREATE POLICY "Teachers/admins can view own payments"
ON public.payments
FOR SELECT
USING (
  (teacher_id = auth.uid() AND (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role)))
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Teachers/admins can insert own payments"
ON public.payments
FOR INSERT
WITH CHECK (
  teacher_id = auth.uid() AND (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);

CREATE POLICY "Teachers/admins can update own payments"
ON public.payments
FOR UPDATE
USING (
  (teacher_id = auth.uid() AND (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role)))
  OR has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  (teacher_id = auth.uid() AND (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role)))
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Teachers/admins can delete own payments"
ON public.payments
FOR DELETE
USING (
  (teacher_id = auth.uid() AND (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role)))
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Fee ledger
DROP POLICY IF EXISTS "Admins can view all ledger entries" ON public.fee_ledger;
DROP POLICY IF EXISTS "Admins can insert ledger entries" ON public.fee_ledger;
DROP POLICY IF EXISTS "Admins can update ledger entries" ON public.fee_ledger;
DROP POLICY IF EXISTS "Admins can delete ledger entries" ON public.fee_ledger;

CREATE POLICY "Teachers/admins can view own ledger entries"
ON public.fee_ledger
FOR SELECT
USING (
  (teacher_id = auth.uid() AND (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role)))
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Teachers/admins can insert own ledger entries"
ON public.fee_ledger
FOR INSERT
WITH CHECK (
  teacher_id = auth.uid() AND (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);

CREATE POLICY "Teachers/admins can update own ledger entries"
ON public.fee_ledger
FOR UPDATE
USING (
  (teacher_id = auth.uid() AND (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role)))
  OR has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  (teacher_id = auth.uid() AND (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role)))
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Teachers/admins can delete own ledger entries"
ON public.fee_ledger
FOR DELETE
USING (
  (teacher_id = auth.uid() AND (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role)))
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Homework
DROP POLICY IF EXISTS "Admins can insert homework" ON public.homework;
DROP POLICY IF EXISTS "Admins can update homework" ON public.homework;
DROP POLICY IF EXISTS "Admins can delete homework" ON public.homework;

CREATE POLICY "Teachers/admins can view own homework"
ON public.homework
FOR SELECT
USING (
  (teacher_id = auth.uid() AND (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role)))
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Teachers/admins can insert own homework"
ON public.homework
FOR INSERT
WITH CHECK (
  teacher_id = auth.uid() AND (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);

CREATE POLICY "Teachers/admins can update own homework"
ON public.homework
FOR UPDATE
USING (
  (teacher_id = auth.uid() AND (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role)))
  OR has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  (teacher_id = auth.uid() AND (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role)))
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Teachers/admins can delete own homework"
ON public.homework
FOR DELETE
USING (
  (teacher_id = auth.uid() AND (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role)))
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Routines
DROP POLICY IF EXISTS "Only admins can view routines" ON public.routines;
DROP POLICY IF EXISTS "Only admins can create routines" ON public.routines;
DROP POLICY IF EXISTS "Only admins can update routines" ON public.routines;
DROP POLICY IF EXISTS "Only admins can delete routines" ON public.routines;

CREATE POLICY "Teachers/admins can view own routines"
ON public.routines
FOR SELECT
USING (
  (teacher_id = auth.uid() AND (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role)))
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Teachers/admins can insert own routines"
ON public.routines
FOR INSERT
WITH CHECK (
  teacher_id = auth.uid() AND (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);

CREATE POLICY "Teachers/admins can update own routines"
ON public.routines
FOR UPDATE
USING (
  (teacher_id = auth.uid() AND (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role)))
  OR has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  (teacher_id = auth.uid() AND (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role)))
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Teachers/admins can delete own routines"
ON public.routines
FOR DELETE
USING (
  (teacher_id = auth.uid() AND (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role)))
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Borrowers
DROP POLICY IF EXISTS "Admins can view all borrowers" ON public.borrowers;
DROP POLICY IF EXISTS "Admins can insert borrowers" ON public.borrowers;
DROP POLICY IF EXISTS "Admins can update borrowers" ON public.borrowers;
DROP POLICY IF EXISTS "Admins can delete borrowers" ON public.borrowers;

CREATE POLICY "Teachers/admins can view own borrowers"
ON public.borrowers
FOR SELECT
USING (
  (teacher_id = auth.uid() AND (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role)))
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Teachers/admins can insert own borrowers"
ON public.borrowers
FOR INSERT
WITH CHECK (
  teacher_id = auth.uid() AND (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);

CREATE POLICY "Teachers/admins can update own borrowers"
ON public.borrowers
FOR UPDATE
USING (
  (teacher_id = auth.uid() AND (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role)))
  OR has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  (teacher_id = auth.uid() AND (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role)))
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Teachers/admins can delete own borrowers"
ON public.borrowers
FOR DELETE
USING (
  (teacher_id = auth.uid() AND (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role)))
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Lending ledger
DROP POLICY IF EXISTS "Admins can view all lending entries" ON public.lending_ledger;
DROP POLICY IF EXISTS "Admins can insert lending entries" ON public.lending_ledger;
DROP POLICY IF EXISTS "Admins can update lending entries" ON public.lending_ledger;
DROP POLICY IF EXISTS "Admins can delete lending entries" ON public.lending_ledger;

CREATE POLICY "Teachers/admins can view own lending entries"
ON public.lending_ledger
FOR SELECT
USING (
  (teacher_id = auth.uid() AND (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role)))
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Teachers/admins can insert own lending entries"
ON public.lending_ledger
FOR INSERT
WITH CHECK (
  teacher_id = auth.uid() AND (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);

CREATE POLICY "Teachers/admins can update own lending entries"
ON public.lending_ledger
FOR UPDATE
USING (
  (teacher_id = auth.uid() AND (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role)))
  OR has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  (teacher_id = auth.uid() AND (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role)))
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Teachers/admins can delete own lending entries"
ON public.lending_ledger
FOR DELETE
USING (
  (teacher_id = auth.uid() AND (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role)))
  OR has_role(auth.uid(), 'admin'::app_role)
);
