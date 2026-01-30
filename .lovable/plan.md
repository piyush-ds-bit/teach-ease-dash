
# Borrower → Multiple Loans Refactor

## Overview
This plan transforms the lending system from treating each borrower as a single loan into a proper **Borrower (person) → Multiple Loans** architecture. The database schema is already in place (`loans` table + `loan_id` in `lending_ledger`), so this focuses on UI/UX changes and data linking.

## Current State Analysis
- **Database**: `loans` table exists, `lending_ledger` has `loan_id` column
- **Legacy Data Issues**:
  - Most ledger entries have `loan_id = null`
  - Duplicate borrowers exist (e.g., "ShreeOm Tiwari" appears twice with same phone)
  - `borrowers` table still has loan-specific fields (`principal_amount`, `interest_type`, etc.)
- **UI**: Treats each borrower row as a loan (shows loan details directly on borrower)

---

## Phase 1: Data Layer Updates

### 1.1 Update Type Definitions
Create a new `Loan` interface and update `Borrower` to be person-only:

```text
src/lib/lendingCalculation.ts
├── Loan interface (id, borrower_id, principal_amount, interest_type, interest_rate, start_date, status, settled_at)
├── BorrowerPerson interface (id, name, profile_photo_url, contact_number, notes, created_at)
├── Update calculateLoanSummary() to work with Loan + entries
├── Add calculateBorrowerLifetimeSummary() for aggregated stats
```

### 1.2 New Hook: useLoans
Create `src/hooks/useLoans.ts`:
- Fetch loans for a borrower
- Add new loan (with auto-settle previous if active exists)
- Update loan
- Settle loan manually
- Real-time subscription

### 1.3 Update useLendingLedger
Modify to scope entries by `loan_id` instead of just `borrower_id`:
- `useLendingLedger(loanId)` - entries for specific loan
- Add `loan_id` when creating entries

---

## Phase 2: Borrowers List Page (`/lending`)

### 2.1 Update BorrowersTable Component
**Before**: Shows loan details per row (principal, interest, balance)
**After**: Shows borrower identity + active loan status

| Column | Description |
|--------|-------------|
| Photo + Name | Borrower identity |
| Phone | Contact number |
| Active Loan | Principal of active loan (or "No active loan") |
| Total Outstanding | Sum of all active loan balances |
| Status | "Active Loan" / "No Active Loan" badge |
| Action | View button |

### 2.2 Update AddBorrowerDialog → Split into Two Flows
**New Add Borrower** (person only):
- Name, Phone, Photo, Notes
- No loan fields

**New Add Loan** (separate dialog):
- Select existing borrower OR create new
- Principal, Interest type, Rate, Start date

---

## Phase 3: Borrower Profile Page (`/borrower/:id`)

### 3.1 Restructure Page Layout

```text
┌─────────────────────────────────────────────────────────────┐
│ BORROWER HEADER (Person Info)                               │
│ ┌────────┐  Name: Subhadeep              [Edit] [Delete]    │
│ │ Avatar │  Phone: 9876543210                               │
│ └────────┘  Notes: Friend from college                      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ LIFETIME SUMMARY CARDS                                      │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐          │
│ │ Total Lent   │ │ Total Paid   │ │ Outstanding  │          │
│ │ ₹50,000      │ │ ₹35,000      │ │ ₹15,000      │          │
│ └──────────────┘ └──────────────┘ └──────────────┘          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ LOANS SECTION                                [+ Add Loan]   │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ Loan #1  │ ₹30,000 │ 2% monthly │ Active │ ₹15,000 due│   │
│ │          │         │            │        │   [View]   │   │
│ ├───────────────────────────────────────────────────────┤   │
│ │ Loan #2  │ ₹20,000 │ 0%         │ Settled│ ₹0 due     │   │
│ │          │         │            │        │   [View]   │   │
│ └───────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 New Components

| Component | Purpose |
|-----------|---------|
| `BorrowerInfoCard` | Person-only header (photo, name, phone, notes) |
| `BorrowerLifetimeSummary` | Aggregated cards (total lent, paid, outstanding) |
| `LoansTable` | List of all loans with status, due amount |
| `AddLoanDialog` | Create new loan for this borrower |
| `LoanDetailSheet` | Sheet/dialog showing loan details + timeline |

---

## Phase 4: Loan Detail Sheet (Dialog/Sheet)

### 4.1 LoanDetailSheet Component
Opens when clicking "View" on a loan:

```text
┌─────────────────────────────────────────────────────────────┐
│ LOAN DETAILS                                    [X Close]   │
│─────────────────────────────────────────────────────────────│
│ Principal: ₹30,000          Start Date: 14 Jul 2024        │
│ Interest: 2% / month        Status: ACTIVE                 │
│─────────────────────────────────────────────────────────────│
│ LOAN SUMMARY CARDS                                          │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐            │
│ │Principal│ │Interest │ │  Paid   │ │Remaining│            │
│ │₹30,000  │ │₹10,800  │ │₹25,800  │ │₹15,000  │            │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘            │
│─────────────────────────────────────────────────────────────│
│                                        [+ Add Payment]      │
│ PAYMENT TIMELINE (scoped to this loan)                      │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ 20 Jan 2026 │ PRINCIPAL │ +₹30,000                    │   │
│ │ 09 Jan 2026 │ PAYMENT   │ -₹5,000    [Edit] [Delete]  │   │
│ └───────────────────────────────────────────────────────┘   │
│─────────────────────────────────────────────────────────────│
│ [Settle Loan]  (only if balance ≤ 0 or manual settle)       │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Business Rules in LoanDetailSheet
- **Settled loans**: Read-only, no Add Payment, no Edit/Delete
- **Auto-settle**: When balance ≤ 0, prompt to settle or leave open
- **Settle Loan button**: Creates ADJUSTMENT entry if needed, marks `settled_at`

---

## Phase 5: Add Loan Flow

### 5.1 From Borrower Profile
- "Add Loan" button opens `AddLoanDialog`
- If active loan exists → auto-settle it first (with confirmation)
- Create new loan in `loans` table
- Create PRINCIPAL entry in `lending_ledger` with `loan_id`

### 5.2 From Lending Dashboard
- "Add Loan" button opens two-step dialog:
  - Step 1: Select existing borrower (searchable) or "Create New Borrower"
  - Step 2: Enter loan details

---

## Phase 6: Legacy Data Migration Utility

### 6.1 Link Orphaned Ledger Entries
Create an Edge Function `lending-link-legacy`:
- Find ledger entries where `loan_id IS NULL`
- Match to loans by `borrower_id` and date logic
- Update `loan_id` for each entry

### 6.2 Create Missing Loans
For borrowers without loans in `loans` table:
- Create a loan from borrower's legacy fields (`principal_amount`, etc.)
- Link existing ledger entries to this loan

### 6.3 Merge Duplicate Borrowers (Optional UI)
For super_admin only:
- Show suggested merges (same phone/name)
- Preview before merge
- Keep original records, just set `merged_into_borrower_id`

---

## File Changes Summary

### New Files
| File | Description |
|------|-------------|
| `src/hooks/useLoans.ts` | Hook for loan CRUD + real-time |
| `src/components/lending/BorrowerInfoCard.tsx` | Person-only header |
| `src/components/lending/BorrowerLifetimeSummary.tsx` | Aggregated stats |
| `src/components/lending/LoansTable.tsx` | List of loans per borrower |
| `src/components/lending/LoanDetailSheet.tsx` | Loan detail in sheet |
| `src/components/lending/AddLoanDialog.tsx` | Create new loan |
| `src/components/lending/SettleLoanButton.tsx` | Settle with ADJUSTMENT |
| `supabase/functions/lending-link-legacy/index.ts` | Link orphaned entries |

### Modified Files
| File | Changes |
|------|---------|
| `src/lib/lendingCalculation.ts` | Add Loan type, update calculations |
| `src/hooks/useLendingLedger.ts` | Scope by loan_id |
| `src/pages/Lending.tsx` | Update summary cards for new model |
| `src/pages/BorrowerProfile.tsx` | Complete restructure |
| `src/components/lending/BorrowersTable.tsx` | Show borrower identity + loan status |
| `src/components/lending/AddBorrowerDialog.tsx` | Person-only, no loan fields |
| `src/components/lending/BorrowerHeader.tsx` | Remove loan fields |
| `src/components/lending/EditBorrowerDialog.tsx` | Person-only edits |
| `src/components/lending/AddPaymentDialog.tsx` | Require loanId |
| `src/components/lending/LendingTimeline.tsx` | Scope to loan entries |

---

## Technical Considerations

### Interest Calculation
- Interest is calculated per-loan using `Loan.start_date`, `Loan.interest_type`, `Loan.interest_rate`
- Settled loans: interest frozen at `settled_at` date

### Auto-Settle Previous Loan
When adding a new loan for a borrower with an active loan:
1. Calculate remaining balance on active loan
2. If balance > 0: Create negative ADJUSTMENT entry to zero it
3. Set `status = 'settled'` and `settled_at = NOW()`
4. Create new loan

### RLS Considerations
All queries filter by `teacher_id = auth.uid()`:
- Loans table already has RLS
- Ledger entries already have RLS
- No changes needed to policies

---

## Testing Checklist
After implementation:
- [ ] Borrowers list shows one row per person (no duplicates)
- [ ] Clicking borrower shows loan history
- [ ] Can add new loan to existing borrower
- [ ] Previous active loan auto-settles
- [ ] Payments apply to specific loan only
- [ ] Settled loans are read-only
- [ ] Lifetime summary shows correct totals
- [ ] Legacy ledger entries still display correctly
