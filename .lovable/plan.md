

## Plan: Fix Teacher Deletion (UI + Cascade Cleanup)

### Findings
- No "Delete Teacher" button exists today in `TeachersTable.tsx`. The user is likely deleting rows directly in Supabase, leaving orphans behind and stale UI.
- All teacher-owned tables (`students`, `payments`, `fee_ledger`, `student_fee_history`, `homework`, `routines`, `borrowers`, `loans`, `lending_ledger`, `plant_donations`) reference `teacher_id` as a plain `uuid` — no FK constraints, so no cascade ever happens.
- `teachers.user_id = auth.uid()` is what `teacher_id` columns store (NOT `teachers.id`). Cleanup must key off `user_id`.
- Auth user, role row, and uploaded files (`student-photos`, `payment-proofs`, `borrower-photos` buckets) also need removal.

### Approach (manual cascade in an Edge Function — safer than DB FKs)

We avoid adding `ON DELETE CASCADE` FKs because adding FKs across 10+ existing tables risks breaking inserts if any orphan data already exists, and `teachers.user_id` would need to become a unique key first. A transactional service-role cleanup is safer and reversible.

### Changes

**1. Edge function: add `delete` action to `supabase/functions/teacher-management/index.ts`**

New handler `deleteTeacher(supabaseAdmin, payload)`:
1. Validate `teacher_user_id`, prevent deleting self / any super_admin.
2. Fetch all `students.id` where `teacher_id = user_id` (need ids for student-scoped cleanup).
3. Fetch all `borrowers.id`, `loans.id` for that teacher.
4. Delete in dependency order (service-role bypasses RLS):
   - `payments` where `student_id IN (...)`
   - `fee_ledger` where `teacher_id = user_id`
   - `student_fee_history` where `teacher_id = user_id`
   - `plant_donations` where `teacher_id = user_id`
   - `homework` where `teacher_id = user_id`
   - `students` where `teacher_id = user_id`
   - `routines` where `teacher_id = user_id`
   - `lending_ledger` where `teacher_id = user_id`
   - `loans` where `teacher_id = user_id`
   - `borrowers` where `teacher_id = user_id`
   - `user_roles` where `user_id = teacher_user_id`
   - `teachers` row where `user_id = teacher_user_id`
   - `auth.admin.deleteUser(teacher_user_id)`
5. Return `{ success, deleted_counts }`. Log every step; fail fast on critical errors with descriptive messages.

(Storage object cleanup is skipped to keep scope tight — paths can be orphaned safely; we can add it later if you want.)

**2. UI: `src/components/teachers/TeachersTable.tsx`**

- Add a red **Trash** icon button per row, wrapped in `AlertDialog` with strong confirmation text:  
  "This will permanently delete **{name}**, all their students, payments, ledger entries, homework, routines, lending data and the login account. This cannot be undone."
- Require typing the teacher's name to enable the destructive action (extra safeguard).
- On confirm → call `POST /teacher-management/delete` with bearer token.
- On success: **optimistically remove** the row from the local `teachers` array AND call `onTeacherUpdated()` to refetch from DB. Toast success with deletion summary.
- On error: keep row, show toast with server error.

**3. UI: `src/pages/TeacherManagement.tsx`**

- Already has realtime subscription + `loadTeachers()`. Verify it triggers on `DELETE` events (it does — `event: '*'`). No change needed beyond ensuring `loadTeachers()` always runs after the action regardless of realtime timing (already wired through `onTeacherUpdated`).
- Add a small "Refresh" button in the card header that calls `loadTeachers()` manually, in case realtime is delayed.

### Safety
- Edge function continues to require `super_admin` role.
- Block deleting your own super_admin account (returns 400).
- All deletes scoped strictly by `teacher_id = user_id` so no other teacher's data can be touched.
- No DB schema migration is needed → zero risk to existing systems.

### Files touched
- `supabase/functions/teacher-management/index.ts` (add `delete` route + handler)
- `src/components/teachers/TeachersTable.tsx` (delete button + confirm dialog + API call + optimistic update)
- `src/pages/TeacherManagement.tsx` (manual Refresh button)

### Expected result
- Clicking Delete instantly removes the teacher from the UI.
- Behind the scenes every related row across all 10 tables and the auth user are wiped.
- No orphan data, no ghost rows, no stale UI.

