

# Fix Production Performance, Fee Timeline, and Receipt Issues

## Problems Identified

### 1. Slow Loading / Infinite Loading in Production

**Root Causes:**

- **ProtectedAdminRoute** makes 3 sequential RPC calls (`has_role` x3) plus a teacher status check on EVERY page load -- 4 round trips before any content renders
- **StudentsTable** fetches ALL columns from `students`, `payments`, and `student_fee_history` tables (no column filtering)
- **DashboardStats** also fetches `students.*` and `payments.*` (full table scans with all columns)
- **useLedger hook** has unstable `useCallback` dependencies (`pausedMonths` and `feeHistory` are arrays that change reference on every render), causing infinite re-sync loops
- No try/catch in `loadStudents()` or `loadData()` -- any error causes permanent loading state
- Missing database indexes on frequently queried columns

### 2. Fee Timeline Never Displays

**Root Cause:**

- The `useLedger` hook's `syncLedger` dependency array includes `pausedMonths` and `feeHistory` which are new array references on every render
- This causes `syncLedger` to be recreated every render, which triggers the `useEffect` to re-run, creating an infinite loop of loading states
- The `autoSync` condition depends on `student` being loaded, but by the time student loads, the dependency array has already changed, causing repeated re-renders
- Meanwhile `fullLedgerSync` calls `supabase.auth.getUser()` internally (another round-trip per call), compounding the problem

### 3. Receipt Shows "Partial Fees Due" Incorrectly

**Root Cause:**

- In `pdfGenerator.ts` line 202-204, the receipt calculates: `totalPayable = data.pendingMonths.length * data.monthlyFee` and then `totalPaid = Math.max(0, totalPayable - data.totalDue)`
- This is circular and wrong -- it estimates totalPaid from pendingMonths count times a single fee, ignoring fee history
- When a student has fully paid but `pendingMonths` still includes months (because `getChargeableMonths` returns ALL chargeable months, not just unpaid ones), the partial due calculation produces incorrect results
- The `GenerateReceiptButton` passes `pendingMonths` from `getChargeableMonths()` which includes ALL months from joining to now (not just unpaid ones)

---

## Implementation Plan

### Step 1: Add Database Indexes

Add indexes to speed up all queries:

```sql
CREATE INDEX IF NOT EXISTS idx_payments_student_id ON public.payments(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_teacher_id ON public.payments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_fee_ledger_student_id ON public.fee_ledger(student_id);
CREATE INDEX IF NOT EXISTS idx_fee_ledger_teacher_id ON public.fee_ledger(teacher_id);
CREATE INDEX IF NOT EXISTS idx_fee_ledger_student_type ON public.fee_ledger(student_id, entry_type);
CREATE INDEX IF NOT EXISTS idx_students_teacher_id ON public.students(teacher_id);
CREATE INDEX IF NOT EXISTS idx_homework_student_id ON public.homework(student_id);
CREATE INDEX IF NOT EXISTS idx_homework_teacher_id ON public.homework(teacher_id);
```

### Step 2: Fix ProtectedAdminRoute -- Reduce Auth Round Trips

**File:** `src/components/admin/ProtectedAdminRoute.tsx`

Instead of 3 separate `has_role` RPC calls, fetch user_roles directly with a single query:

```
Before: 3 RPC calls (has_role for teacher, admin, super_admin)
After:  1 SELECT from user_roles where user_id = session.user.id
```

This cuts auth check from ~4 round trips to ~2 (getSession + single query).

### Step 3: Fix useLedger Infinite Loop

**File:** `src/hooks/useLedger.ts`

- Stabilize `pausedMonths` and `feeHistory` references using `JSON.stringify` comparison
- Separate the initial sync from re-renders using a ref to track if initial sync has been done
- Add try/catch with proper error states
- Prevent loading state from getting stuck

```
Key change: 
- Use useRef to store serialized versions of pausedMonths/feeHistory
- Only trigger sync when serialized values actually change
- Add timeout protection for loading states
```

### Step 4: Fix StudentsTable Loading -- Add Error Handling and Column Selection

**File:** `src/components/dashboard/StudentsTable.tsx`

- Wrap `loadStudents()` in try/catch so errors don't cause permanent loading
- Select only needed columns instead of `*`
- Add error state display instead of infinite spinner

### Step 5: Fix DashboardStats -- Optimize Queries

**File:** `src/components/dashboard/DashboardStats.tsx`

- Select only needed columns: `students(id, monthly_fee)` and `payments(amount_paid, month)`
- Wrap in try/catch

### Step 6: Fix StudentProfile Loading

**File:** `src/pages/StudentProfile.tsx`

- Wrap `loadData()` in try/catch to prevent permanent loading state
- Ensure `setLoading(false)` always runs (move to finally block)

### Step 7: Fix Receipt "Partial Fees Due" Logic

**File:** `src/lib/pdfGenerator.ts`

The core problem: the receipt recalculates partial due using `pendingMonths.length * monthlyFee` which is wrong with fee history.

Fix:
- Pass `totalPaid` directly to the receipt (already available from StudentProfile)
- Pass fee history data or the pre-calculated `partialDueInfo` from `getStudentFeeData()`
- Remove the incorrect re-derivation of totalPaid inside pdfGenerator

**File:** `src/components/student/GenerateReceiptButton.tsx`

- Add `totalPaid` and `feeHistory` props
- Pass these to `generateReceipt()`

**File:** `src/pages/StudentProfile.tsx`

- Pass `totalPaid` and fee history to `GenerateReceiptButton`

**Updated receipt logic:**
```
Before (wrong):
  totalPayable = pendingMonths.length * monthlyFee
  totalPaid = totalPayable - totalDue
  partialDueInfo = getPartialDueInfo(totalDue, monthlyFee, pendingMonths, totalPaid)

After (correct):
  Use pre-calculated partialDueInfo from getStudentFeeData()
  OR use getPartialDueInfoWithHistory() with actual fee history data
  Only show "Partial" if there is genuinely a partial payment for a month
```

### Step 8: Fix Pending Months Passed to Receipt

**File:** `src/pages/StudentProfile.tsx`

Currently passes ALL chargeable months to the receipt. Should only pass UNPAID months.

```
Before: pendingMonths = getChargeableMonths(joiningDate, pausedMonths) // ALL months
After:  Calculate actual unpaid months using fee history and payments
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/admin/ProtectedAdminRoute.tsx` | Single query instead of 3 RPCs |
| `src/hooks/useLedger.ts` | Fix infinite loop, stabilize deps, add error handling |
| `src/components/dashboard/StudentsTable.tsx` | Add try/catch, select fewer columns |
| `src/components/dashboard/DashboardStats.tsx` | Add try/catch, select fewer columns |
| `src/pages/StudentProfile.tsx` | Add try/catch, fix pendingMonths, pass correct data to receipt |
| `src/lib/pdfGenerator.ts` | Fix partial due calculation to use pre-calculated data |
| `src/components/student/GenerateReceiptButton.tsx` | Accept totalPaid and partialDueInfo props |

## Database Migration

One new migration to add indexes on key columns.

---

## Expected Results After Fix

- Dashboard loads in 1-2 seconds (fewer round trips, indexed queries)
- Fee Timeline displays correctly (no infinite re-render loop)
- Receipt never shows "Partial Fees Due" when student is fully paid
- No infinite loading spinners (all async operations have try/catch/finally)
- Error states shown instead of permanent spinners when queries fail

