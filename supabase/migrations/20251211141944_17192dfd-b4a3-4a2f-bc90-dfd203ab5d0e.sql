-- Add paused_months column to students table
ALTER TABLE public.students
ADD COLUMN IF NOT EXISTS paused_months TEXT[] DEFAULT '{}';