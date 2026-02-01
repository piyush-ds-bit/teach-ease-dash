
# Teacher-Only Platform Implementation Plan

## Overview
Transform the app into a teacher-only platform where:
- You (piyushbusiness@example.com) are the only Super Admin
- Teachers can only be created via invite by the Super Admin
- Each teacher sees only their own data
- No student login functionality

## Current State (Already Done)
Based on the existing codebase and memories:
- `super_admin` role exists in database
- `teachers` table with status (active/suspended) exists
- All data tables have `teacher_id` column
- RLS policies enforce `teacher_id = auth.uid()` isolation
- Student login pages already removed

## Phase 1: Cleanup Legacy Student Auth Code

### 1.1 Delete student-auth Edge Function
Remove `supabase/functions/student-auth/` entirely - no longer needed.

### 1.2 Update ProtectedAdminRoute
Remove the student session localStorage check (lines 40-44) and update to check for `teacher` OR `admin` OR `super_admin` roles.

```text
Changes to src/components/admin/ProtectedAdminRoute.tsx:
- Remove localStorage student_session check
- Update role check to include: teacher, admin, super_admin
```

---

## Phase 2: Create Teacher Management Infrastructure

### 2.1 New Edge Function: teacher-management
Create `supabase/functions/teacher-management/index.ts` to handle:
- **Create teacher**: Uses Supabase Admin API to create auth user
- **Generate invite link**: Creates password reset link for first-time login
- **Update status**: Pause/resume teacher accounts

```text
Endpoints:
POST /create - Create new teacher (super_admin only)
  - Creates Supabase Auth user
  - Inserts into teachers table
  - Assigns 'teacher' role in user_roles
  - Returns invite link

POST /update-status - Pause/resume teacher (super_admin only)
  - Updates teachers.status
  - If paused: marks auth user as banned

POST /resend-invite - Regenerate invite link (super_admin only)
```

### 2.2 Update supabase/config.toml
Add teacher-management function with `verify_jwt = false` (we validate in code).

---

## Phase 3: Protected Routes for Super Admin

### 3.1 Create ProtectedSuperAdminRoute Component
`src/components/admin/ProtectedSuperAdminRoute.tsx`
- Check for `super_admin` role
- Redirect to dashboard if not super admin

### 3.2 Add Super Admin Routes to App.tsx
```text
/super-admin/teachers → Teacher management page
```

---

## Phase 4: Teacher Management UI (Super Admin Only)

### 4.1 Teacher Management Page
`src/pages/TeacherManagement.tsx`

Layout:
```text
+--------------------------------------------------+
| TeachEase - Teacher Management                   |
+--------------------------------------------------+
| [+ Add Teacher]                                  |
+--------------------------------------------------+
| Teachers List                                    |
| +----------------------------------------------+ |
| | Name     | Email    | Status | Actions      | |
| |----------|----------|--------|--------------||| |
| | John Doe | j@ex.com | Active | Pause | Link | |
| | Jane Doe | ja@ex.com| Paused | Resume| Link | |
| +----------------------------------------------+ |
+--------------------------------------------------+
```

### 4.2 AddTeacherDialog Component
`src/components/teachers/AddTeacherDialog.tsx`
- Full Name (required)
- Email (required)
- Phone (optional)
- Initial status: Active

On submit:
1. Call teacher-management edge function
2. Show invite link in success dialog with copy button

### 4.3 TeachersTable Component
`src/components/teachers/TeachersTable.tsx`
- List all teachers
- Show status badge (Active/Suspended)
- Actions: Pause/Resume, Copy Invite Link

### 4.4 Super Admin FAB (Floating Action Button)
`src/components/admin/SuperAdminFAB.tsx`
- Shows only for super_admin role
- Fixed bottom-left position
- Links to /super-admin/teachers

---

## Phase 5: Update Auth Flow

### 5.1 Update Auth Page Login
`src/pages/Auth.tsx`
- After login, check if teacher is suspended
- If suspended: sign out and show "Account paused" message
- No sign-up button (invite-only)

### 5.2 Update ProtectedAdminRoute
After auth check, also verify teacher is not suspended by checking `teachers` table.

---

## Phase 6: Add teacher_id to All Data Operations

### 6.1 Update Insert Operations
All insert operations must include `teacher_id: user.id`

Files to update:
| File | Function/Component |
|------|-------------------|
| `src/components/dashboard/AddStudentDialog.tsx` | Add teacher_id to insert |
| `src/components/student/AddPaymentDialog.tsx` | Add teacher_id to insert |
| `src/components/routine/AddRoutineDialog.tsx` | Add teacher_id to insert |
| `src/lib/ledgerCalculation.ts` | Add teacher_id to all insert functions |
| `src/components/homework/AddHomeworkDialog.tsx` | Add teacher_id to insert |

Pattern for each file:
```typescript
// Get current user
const { data: { user } } = await supabase.auth.getUser();
if (!user) throw new Error('Not authenticated');

// Include teacher_id in insert
await supabase.from("table_name").insert({
  ...otherFields,
  teacher_id: user.id,
});
```

### 6.2 Update Edit Operations
Files like EditStudentDialog, EditPaymentDialog, EditRoutineDialog should NOT change teacher_id on update (it's immutable).

---

## Phase 7: Navigation Updates

### 7.1 Update DashboardHeader
`src/components/dashboard/DashboardHeader.tsx`
- Remove any student-related links (already done)
- Keep: Students, Routine, Lending, Logout

### 7.2 Add Super Admin FAB
Visible only to super_admin role at bottom-left corner, linking to teacher management.

---

## File Changes Summary

### New Files
| File | Purpose |
|------|---------|
| `supabase/functions/teacher-management/index.ts` | Edge function for teacher CRUD |
| `src/components/admin/ProtectedSuperAdminRoute.tsx` | Route guard for super admin |
| `src/components/admin/SuperAdminFAB.tsx` | Floating button for super admin |
| `src/pages/TeacherManagement.tsx` | Teacher management page |
| `src/components/teachers/AddTeacherDialog.tsx` | Add teacher dialog |
| `src/components/teachers/TeachersTable.tsx` | Teachers list table |
| `src/hooks/useCurrentUserRole.ts` | Hook to check current user's role |

### Modified Files
| File | Changes |
|------|---------|
| `src/App.tsx` | Add super admin routes |
| `src/components/admin/ProtectedAdminRoute.tsx` | Remove student references, add teacher/super_admin checks |
| `src/pages/Auth.tsx` | Add suspended teacher check |
| `src/components/dashboard/DashboardHeader.tsx` | Add SuperAdminFAB |
| `src/components/dashboard/AddStudentDialog.tsx` | Add teacher_id |
| `src/components/student/AddPaymentDialog.tsx` | Add teacher_id |
| `src/components/routine/AddRoutineDialog.tsx` | Add teacher_id |
| `src/lib/ledgerCalculation.ts` | Add teacher_id to all functions |
| `supabase/config.toml` | Add teacher-management function |

### Deleted Files
| File | Reason |
|------|--------|
| `supabase/functions/student-auth/` | Student auth no longer needed |

---

## Security Considerations

1. **Role Verification**: All super_admin operations verified server-side in edge function
2. **teacher_id Isolation**: RLS policies already enforce data isolation
3. **Invite-Only**: No public signup - teachers created via edge function with admin API
4. **Suspended Teachers**: Auth check blocks login for paused accounts
5. **bcrypt**: Edge function uses bcrypt for any password operations (cost factor 12)

---

## Testing Checklist
After implementation:
- [ ] Super Admin can create new teachers
- [ ] Invite link works for first-time teacher login
- [ ] Teachers see only their own students/data
- [ ] Paused teachers cannot log in
- [ ] Super Admin FAB visible only to super_admin
- [ ] Teacher management page accessible only to super_admin
- [ ] All insert operations include teacher_id
