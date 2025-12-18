
-- Delete duplicate entries keeping only the oldest one per (student_id, month_key, entry_type)
DELETE FROM fee_ledger
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY student_id, month_key, entry_type
             ORDER BY created_at ASC
           ) as rn
    FROM fee_ledger
  ) duplicates
  WHERE rn > 1
);

-- Also clean up entries with invalid month_key format (like "August 2025" instead of "2025-08")
-- These were created with wrong format during initial sync
DELETE FROM fee_ledger
WHERE month_key ~ '^[A-Za-z]+ [0-9]{4}$';

-- Add unique constraint to prevent future duplicates
CREATE UNIQUE INDEX IF NOT EXISTS fee_ledger_unique_entry 
ON fee_ledger (student_id, month_key, entry_type);
