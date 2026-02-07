
# Fee History Tracking Implementation Plan

## Overview

This plan fixes the issue where changing a student's monthly fee incorrectly applies the new rate to all past months. After implementation, fee changes will only affect the current month and future months, while past dues remain calculated at their original rates.

---

## What's Changing

When you update a student's fee from ₹1500 to ₹2000:
- **Before**: All months (Jan to present) incorrectly show ₹2000 each
- **After**: Jan-Apr remain at ₹1500, May onward at ₹2000

---

## Implementation Steps

### Step 1: Create Fee History Table

Create a new database table `student_fee_history` to track fee changes:

| Column | Type | Purpose |
|--------|------|---------|
| id | uuid | Primary key |
| student_id | uuid | Links to students table |
| monthly_fee | numeric | Fee amount for this period |
| effective_from_month | text | YYYY-MM format when fee starts |
| created_at | timestamp | When record was created |
| teacher_id | uuid | For data isolation |

Add RLS policies matching the students table pattern.

### Step 2: Backward Compatibility Migration

Run a one-time data migration to create fee history for all existing students:
- For each student without fee history
- Create one entry using their current `monthly_fee`
- Set `effective_from_month` to their joining month

This ensures existing data continues to work correctly.

### Step 3: Update Student Creation Flow

Modify `AddStudentDialog.tsx`:
- After creating the student record
- Insert initial fee history entry with `effective_from_month` = joining month

### Step 4: Update Fee Edit Flow

Modify `EditStudentDialog.tsx`:
- When monthly fee changes
- Insert a **new** fee history entry with `effective_from_month` = current month (YYYY-MM)
- Continue updating `students.monthly_fee` for display purposes
- Do NOT modify past fee history entries

### Step 5: Create Fee History Helper Functions

Create new file `src/lib/feeHistoryCalculation.ts`:

```text
Functions to implement:
├── getFeeForMonth(studentId, monthKey) → Returns applicable fee for a specific month
├── getFeeHistory(studentId) → Returns all fee history entries
├── calculateTotalPayableWithHistory(joiningDate, feeHistory, pausedMonths) → Calculates total using correct fees per month
└── getApplicableFee(monthKey, feeHistory) → Finds fee that was active for a given month
```

**Core Logic:**
For each month from joining to now:
1. Find the fee history entry where `effective_from_month ≤ month`
2. Use the most recent such entry (latest effective date that hasn't passed the month)
3. Skip paused months
4. Sum all applicable fees

### Step 6: Update Fee Calculation Functions

Modify `src/lib/feeCalculation.ts`:

**calculateTotalPayable()** - Update to accept fee history array:
```text
Before: calculateTotalPayable(joiningDate, monthlyFee, pausedMonths)
After:  calculateTotalPayable(joiningDate, feeHistory, pausedMonths)

Logic change:
- Instead of count × monthlyFee
- Sum each month's individual fee based on what was active that month
```

**getStudentFeeData()** - Fetch and include fee history:
```text
- Add query to fetch student_fee_history
- Pass fee history to calculation functions
- Return fee history in response for UI use
```

### Step 7: Update Ledger Generation

Modify `src/lib/ledgerCalculation.ts`:

**generateFeeEntries()** - Use correct fee per month:
```text
Before: All entries use same monthlyFee
After:  Each entry uses the fee that was active for that specific month
```

### Step 8: Update Component Fee Calculations

**StudentsTable.tsx:**
- Fetch fee history for each student
- Pass to updated calculateTotalPayable()

**StudentProfile.tsx:**
- Fetch fee history
- Use in all due calculations

**FeeTimeline.tsx:**
- No changes needed (already uses ledger entries with amounts)

### Step 9: Update PDF Generation

**pdfGenerator.ts:**
- Partial due calculations will automatically use correct amounts
- No structural changes needed since it receives pendingMonths and totalDue as inputs

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/lib/feeHistoryCalculation.ts` | New helper functions for fee history |

## Files to Modify

| File | Changes |
|------|---------|
| `src/lib/feeCalculation.ts` | Update functions to use fee history |
| `src/lib/ledgerCalculation.ts` | Use correct fee per month when generating entries |
| `src/components/dashboard/AddStudentDialog.tsx` | Insert initial fee history on creation |
| `src/components/student/EditStudentDialog.tsx` | Insert new fee history on fee change |
| `src/components/dashboard/StudentsTable.tsx` | Fetch and use fee history |
| `src/pages/StudentProfile.tsx` | Fetch and use fee history |
| `src/hooks/useLedger.ts` | Pass fee history to sync function |

---

## Database Migration SQL

```sql
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
    (teacher_id = auth.uid() AND (has_role(auth.uid(), 'teacher') OR has_role(auth.uid(), 'admin')))
    OR has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Teachers/admins can insert own fee history"
  ON public.student_fee_history FOR INSERT
  WITH CHECK (
    teacher_id = auth.uid() AND (has_role(auth.uid(), 'teacher') OR has_role(auth.uid(), 'admin'))
  );

-- Backfill existing students
INSERT INTO public.student_fee_history (student_id, monthly_fee, effective_from_month, teacher_id)
SELECT 
  id,
  monthly_fee,
  TO_CHAR(joining_date, 'YYYY-MM'),
  teacher_id
FROM public.students
WHERE id NOT IN (SELECT DISTINCT student_id FROM public.student_fee_history);

-- Index for performance
CREATE INDEX idx_fee_history_student_month ON public.student_fee_history(student_id, effective_from_month);
```

---

## What Stays the Same

- `students.monthly_fee` field remains (for display of current fee)
- `payments` table - no changes
- `fee_ledger` table - no schema changes
- Pause logic - unaffected
- PDF format - unaffected
- All existing payment records - untouched

---

## Example Scenario After Implementation

**Student: Rahul**
- Joined: January 2025
- Initial fee: ₹1500
- Fee changed to ₹2000 on February 7, 2026

**Fee History Table:**
| effective_from_month | monthly_fee |
|---------------------|-------------|
| 2025-01 | ₹1500 |
| 2026-02 | ₹2000 |

**Due Calculation (as of Feb 7, 2026):**
- Jan 2025: ₹1500 ✓
- Feb 2025: ₹1500 ✓
- ... (all 2025 months at ₹1500)
- Jan 2026: ₹1500 ✓
- Feb 2026: Not due yet (current month)

**Total Payable:** 13 months × ₹1500 = ₹19,500

When March 2026 comes:
- Feb 2026 becomes due at ₹2000 (the new rate)
- Total: ₹19,500 + ₹2000 = ₹21,500

---

## Technical Notes

### Fee Lookup Algorithm
```text
getApplicableFee(targetMonth, feeHistory):
  1. Filter feeHistory where effective_from_month ≤ targetMonth
  2. Sort by effective_from_month descending
  3. Return the first entry's monthly_fee
  4. If no entries, throw error (shouldn't happen with proper data)
```

### Type Definition
```typescript
type FeeHistoryEntry = {
  id: string;
  student_id: string;
  monthly_fee: number;
  effective_from_month: string; // YYYY-MM
  created_at: string;
  teacher_id: string | null;
};
```

### Calculation Flow
```text
1. Load student data
2. Load fee history for student
3. For each month from joining to (current - 1):
   a. Skip if paused
   b. Find applicable fee for that month
   c. Add to total
4. Total payable = sum of all month fees
5. Total due = Total payable - Total paid
```

---

## Testing Checklist

After implementation, verify:
1. New student creation adds fee history entry
2. Editing fee creates new history entry (doesn't modify old)
3. Dashboard shows correct dues for students with fee changes
4. Student profile shows correct totals
5. Fee timeline displays correct amounts per month
6. PDF receipts show correct pending amounts
7. Existing students (without explicit history) work correctly via backfill
