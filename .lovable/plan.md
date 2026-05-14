## Plan: Teacher Profile Avatar + Mobile Edit Form Scroll Fix

### Feature 1 — Teacher Profile Photo + Avatar Menu

**DB migration**
- Add `profile_photo_url TEXT NULL` to `public.teachers` (full_name + email already exist).
- Create private storage bucket `teacher-profiles` with RLS:
  - Teacher can `SELECT/INSERT/UPDATE/DELETE` only objects whose first folder = their `auth.uid()`.
  - Admins can manage all.

**New component: `src/components/profile/TeacherProfileMenu.tsx`**
- Fetches current teacher row (`teachers` filtered by `user_id = auth.uid()`).
- Resolves signed URL (1-year) for `profile_photo_url` if present.
- Renders circular `Avatar` (image or initials from `full_name`).
- Click → `DropdownMenu` (or `Popover`) with glassmorphism card:
  - Larger avatar, full name, email
  - "Edit Profile" → opens `EditTeacherProfileDialog`
  - "Logout" → existing confirm flow
- Loading skeleton; no broken-image flash (use `onError` + fallback to initials).

**New component: `src/components/profile/EditTeacherProfileDialog.tsx`**
- Edit `full_name`, upload/replace/remove avatar.
- Accepts jpg/jpeg/png/webp; client-side compress (canvas resize to max 512px, 0.85 quality) before upload.
- Path: `${user.id}/avatar.<ext>`; deletes prior file on change.
- Updates `teachers.profile_photo_url` with the storage path (not URL); component resolves signed URL on render.

**Header changes (`DashboardHeader.tsx`)**
- Remove standalone Logout button + AlertDialog (logout moves into avatar dropdown).
- Mount `<TeacherProfileMenu />` in the top-right slot.
- Keep nav (Students/Routine/Lending) unchanged.

**Data isolation**
- All reads filtered by `user_id = auth.uid()` and protected by existing teachers RLS.
- Storage RLS scopes to per-user folder.

---

### Feature 2 — Mobile scroll fix for Edit Student dialog

File: `src/components/student/EditStudentDialog.tsx`

- Change `DialogContent` to:  
  `className="sm:max-w-[500px] max-h-[90dvh] flex flex-col p-0"`
- Wrap form so structure is:
  ```
  <form className="flex flex-col min-h-0 flex-1">
    <DialogHeader className="px-6 pt-6" />
    <div className="flex-1 overflow-y-auto px-6 py-4 overscroll-contain">…fields…</div>
    <DialogFooter className="sticky bottom-0 bg-background border-t px-6 py-4 pb-[env(safe-area-inset-bottom)]">
      <Button type="button" variant="outline" onClick={()=>setOpen(false)}>Cancel</Button>
      <Button type="submit">Update</Button>
    </DialogFooter>
  </form>
  ```
- Use `dvh` (dynamic viewport) so mobile keyboard does not hide the sticky action bar.
- Apply the same pattern to `EditTeacherProfileDialog` for consistency.

(Other edit dialogs are out of scope unless the user asks — the report only mentioned Student → Edit Profile.)

---

### Files touched
- DB migration (teachers column + storage bucket + policies)
- `src/components/dashboard/DashboardHeader.tsx` — remove logout, mount avatar menu
- `src/components/profile/TeacherProfileMenu.tsx` — new
- `src/components/profile/EditTeacherProfileDialog.tsx` — new
- `src/lib/imageCompression.ts` — small helper (canvas resize)
- `src/components/student/EditStudentDialog.tsx` — sticky footer + scroll fix

### Manual steps
- None — bucket + policies created via migration.

### Out of scope
- Reusing avatar menu on other pages' headers (only DashboardHeader is shared across protected routes already).
- A dedicated `/profile` route — Edit happens in dialog from dropdown.