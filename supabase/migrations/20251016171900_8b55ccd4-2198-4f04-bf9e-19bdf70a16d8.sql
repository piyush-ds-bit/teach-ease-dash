-- Create routines table for tuition timings
CREATE TABLE public.routines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  day_of_week TEXT NOT NULL CHECK (day_of_week IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')),
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.routines ENABLE ROW LEVEL SECURITY;

-- Create policies for admin access only
CREATE POLICY "Only admins can view routines" 
ON public.routines 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can create routines" 
ON public.routines 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update routines" 
ON public.routines 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete routines" 
ON public.routines 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add subject column to students table
ALTER TABLE public.students 
ADD COLUMN subject TEXT;

COMMENT ON COLUMN students.subject IS 'Subject the student is studying (e.g., Mathematics, Science)';
COMMENT ON TABLE routines IS 'Weekly tuition routine/timetable for admin';