-- 1) Loan status enum (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'loan_status'
  ) THEN
    CREATE TYPE public.loan_status AS ENUM ('active', 'settled');
  END IF;
END $$;

-- 2) Borrowers: add merge pointer (non-destructive)
ALTER TABLE public.borrowers
  ADD COLUMN IF NOT EXISTS merged_into_borrower_id uuid NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'borrowers_merged_into_borrower_id_fkey'
  ) THEN
    ALTER TABLE public.borrowers
      ADD CONSTRAINT borrowers_merged_into_borrower_id_fkey
      FOREIGN KEY (merged_into_borrower_id)
      REFERENCES public.borrowers(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_borrowers_teacher_merge
  ON public.borrowers(teacher_id, merged_into_borrower_id);

-- 3) Loans table (new)
CREATE TABLE IF NOT EXISTS public.loans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  borrower_id uuid NOT NULL REFERENCES public.borrowers(id) ON DELETE CASCADE,
  teacher_id uuid NULL,
  principal_amount numeric NOT NULL,
  interest_type public.interest_type NOT NULL DEFAULT 'zero_interest'::public.interest_type,
  interest_rate numeric NULL DEFAULT 0,
  start_date date NOT NULL,
  status public.loan_status NOT NULL DEFAULT 'active'::public.loan_status,
  settled_at timestamptz NULL,
  legacy_borrower_id uuid NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_loans_borrower_teacher
  ON public.loans(borrower_id, teacher_id);

CREATE INDEX IF NOT EXISTS idx_loans_borrower_status
  ON public.loans(borrower_id, status);

-- 4) Lending ledger: add loan_id link (non-destructive)
ALTER TABLE public.lending_ledger
  ADD COLUMN IF NOT EXISTS loan_id uuid NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'lending_ledger_loan_id_fkey'
  ) THEN
    ALTER TABLE public.lending_ledger
      ADD CONSTRAINT lending_ledger_loan_id_fkey
      FOREIGN KEY (loan_id)
      REFERENCES public.loans(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_lending_ledger_loan
  ON public.lending_ledger(loan_id, entry_date, created_at);

-- 5) RLS for loans (teacher/admin isolation)
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- SELECT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='loans' AND policyname='Teachers/admins can view own loans'
  ) THEN
    CREATE POLICY "Teachers/admins can view own loans"
    ON public.loans
    FOR SELECT
    USING (
      (((teacher_id = auth.uid()) AND (has_role(auth.uid(), 'teacher'::public.app_role) OR has_role(auth.uid(), 'admin'::public.app_role) OR has_role(auth.uid(), 'super_admin'::public.app_role)))
      OR has_role(auth.uid(), 'admin'::public.app_role)
      OR has_role(auth.uid(), 'super_admin'::public.app_role))
    );
  END IF;

  -- INSERT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='loans' AND policyname='Teachers/admins can insert own loans'
  ) THEN
    CREATE POLICY "Teachers/admins can insert own loans"
    ON public.loans
    FOR INSERT
    WITH CHECK (
      (teacher_id = auth.uid()) AND (has_role(auth.uid(), 'teacher'::public.app_role) OR has_role(auth.uid(), 'admin'::public.app_role) OR has_role(auth.uid(), 'super_admin'::public.app_role))
    );
  END IF;

  -- UPDATE
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='loans' AND policyname='Teachers/admins can update own loans'
  ) THEN
    CREATE POLICY "Teachers/admins can update own loans"
    ON public.loans
    FOR UPDATE
    USING (
      (((teacher_id = auth.uid()) AND (has_role(auth.uid(), 'teacher'::public.app_role) OR has_role(auth.uid(), 'admin'::public.app_role) OR has_role(auth.uid(), 'super_admin'::public.app_role)))
      OR has_role(auth.uid(), 'admin'::public.app_role)
      OR has_role(auth.uid(), 'super_admin'::public.app_role))
    )
    WITH CHECK (
      (((teacher_id = auth.uid()) AND (has_role(auth.uid(), 'teacher'::public.app_role) OR has_role(auth.uid(), 'admin'::public.app_role) OR has_role(auth.uid(), 'super_admin'::public.app_role)))
      OR has_role(auth.uid(), 'admin'::public.app_role)
      OR has_role(auth.uid(), 'super_admin'::public.app_role))
    );
  END IF;

  -- DELETE
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='loans' AND policyname='Teachers/admins can delete own loans'
  ) THEN
    CREATE POLICY "Teachers/admins can delete own loans"
    ON public.loans
    FOR DELETE
    USING (
      (((teacher_id = auth.uid()) AND (has_role(auth.uid(), 'teacher'::public.app_role) OR has_role(auth.uid(), 'admin'::public.app_role) OR has_role(auth.uid(), 'super_admin'::public.app_role)))
      OR has_role(auth.uid(), 'admin'::public.app_role)
      OR has_role(auth.uid(), 'super_admin'::public.app_role))
    );
  END IF;
END $$;

-- 6) Non-destructive AUTO-MERGE by phone then name (only where teacher_id is set)
-- Canonical borrower = earliest created_at in each (teacher_id, key) group.
WITH ranked AS (
  SELECT
    id,
    teacher_id,
    created_at,
    COALESCE(NULLIF(contact_number, ''), NULLIF(name, '')) AS merge_key,
    FIRST_VALUE(id) OVER (
      PARTITION BY teacher_id, COALESCE(NULLIF(contact_number, ''), NULLIF(name, ''))
      ORDER BY created_at ASC
    ) AS canonical_id
  FROM public.borrowers
  WHERE teacher_id IS NOT NULL
)
UPDATE public.borrowers b
SET merged_into_borrower_id = r.canonical_id
FROM ranked r
WHERE b.id = r.id
  AND r.merge_key IS NOT NULL
  AND b.id <> r.canonical_id
  AND b.merged_into_borrower_id IS NULL;

-- 7) Create one loan per legacy borrower row, attached to canonical borrower
INSERT INTO public.loans (
  borrower_id,
  teacher_id,
  principal_amount,
  interest_type,
  interest_rate,
  start_date,
  status,
  legacy_borrower_id,
  created_at
)
SELECT
  COALESCE(b.merged_into_borrower_id, b.id) AS canonical_borrower_id,
  b.teacher_id,
  b.principal_amount,
  b.interest_type,
  COALESCE(b.interest_rate, 0),
  b.loan_start_date,
  'active'::public.loan_status,
  b.id AS legacy_borrower_id,
  b.created_at
FROM public.borrowers b
WHERE b.teacher_id IS NOT NULL
  AND b.id IS NOT NULL
ON CONFLICT (legacy_borrower_id) DO NOTHING;

-- 8) Backfill lending_ledger.loan_id from legacy borrower mapping
UPDATE public.lending_ledger ll
SET loan_id = l.id
FROM public.loans l
WHERE ll.loan_id IS NULL
  AND l.legacy_borrower_id = ll.borrower_id;