-- Create fee history table
CREATE TABLE public.student_fee_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  monthly_fee numeric NOT NULL,
  effective_from_month text NOT NULL, -- Format: YYYY-MM
  created_at timestamptz NOT NULL DEFAULT now(),
  teacher_id uuid,
  
  -- Ensure one fee per effective month per student
  UNIQUE(student_id, effective_from_month)
);

-- Enable RLS
ALTER TABLE public.student_fee_history ENABLE ROW LEVEL SECURITY;

-- RLS policies (same pattern as students table)
CREATE POLICY "Teachers/admins can view own fee history"
  ON public.student_fee_history FOR SELECT
  USING (
    ((teacher_id = auth.uid()) AND (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role)))
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Teachers/admins can insert own fee history"
  ON public.student_fee_history FOR INSERT
  WITH CHECK (
    (teacher_id = auth.uid()) AND (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  );

CREATE POLICY "Teachers/admins can update own fee history"
  ON public.student_fee_history FOR UPDATE
  USING (
    ((teacher_id = auth.uid()) AND (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role)))
    OR has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    ((teacher_id = auth.uid()) AND (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role)))
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Teachers/admins can delete own fee history"
  ON public.student_fee_history FOR DELETE
  USING (
    ((teacher_id = auth.uid()) AND (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role)))
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- Backfill existing students with their current fee as initial history
INSERT INTO public.student_fee_history (student_id, monthly_fee, effective_from_month, teacher_id)
SELECT 
  id,
  monthly_fee,
  TO_CHAR(joining_date, 'YYYY-MM'),
  teacher_id
FROM public.students;

-- Index for performance
CREATE INDEX idx_fee_history_student_month ON public.student_fee_history(student_id, effective_from_month);