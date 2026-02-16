
CREATE INDEX IF NOT EXISTS idx_payments_student_id ON public.payments(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_teacher_id ON public.payments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_fee_ledger_student_id ON public.fee_ledger(student_id);
CREATE INDEX IF NOT EXISTS idx_fee_ledger_teacher_id ON public.fee_ledger(teacher_id);
CREATE INDEX IF NOT EXISTS idx_fee_ledger_student_type ON public.fee_ledger(student_id, entry_type);
CREATE INDEX IF NOT EXISTS idx_students_teacher_id ON public.students(teacher_id);
CREATE INDEX IF NOT EXISTS idx_homework_student_id ON public.homework(student_id);
CREATE INDEX IF NOT EXISTS idx_homework_teacher_id ON public.homework(teacher_id);
CREATE INDEX IF NOT EXISTS idx_student_fee_history_student_id ON public.student_fee_history(student_id);
