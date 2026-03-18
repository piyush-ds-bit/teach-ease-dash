
-- Add date_of_birth to students
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS date_of_birth date;

-- Create plant_donations table
CREATE TABLE IF NOT EXISTS public.plant_donations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  donation_date date NOT NULL,
  year integer NOT NULL,
  teacher_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(student_id, year)
);

-- Enable RLS
ALTER TABLE public.plant_donations ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Teachers/admins can view own plant donations" ON public.plant_donations
  FOR SELECT TO public
  USING (
    ((teacher_id = auth.uid()) AND (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role)))
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Teachers/admins can insert own plant donations" ON public.plant_donations
  FOR INSERT TO public
  WITH CHECK (
    (teacher_id = auth.uid()) AND (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  );

CREATE POLICY "Teachers/admins can delete own plant donations" ON public.plant_donations
  FOR DELETE TO public
  USING (
    ((teacher_id = auth.uid()) AND (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role)))
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_students_date_of_birth ON public.students(date_of_birth);
CREATE INDEX IF NOT EXISTS idx_plant_donations_student_year ON public.plant_donations(student_id, year);
