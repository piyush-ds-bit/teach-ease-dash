
# Fix Teacher Invite Flow - 404 Error Resolution

## Problem Summary
Teachers clicking invite links see a 404 error because:
1. Missing `/auth/callback` route to handle Supabase auth redirects
2. The current flow doesn't properly handle Supabase's standard recovery redirect mechanism
3. Need to add `/set-password` as a cleaner route for the password setup

## Solution Architecture

```text
+------------------+     +-------------------+     +------------------+     +-------------+
| Super Admin      | --> | Edge Function     | --> | Invite Link      | --> | Teacher     |
| Creates Teacher  |     | Generates Link    |     | with Token       |     | Clicks Link |
+------------------+     +-------------------+     +------------------+     +-------------+
                                                                                   |
                                                                                   v
+------------------+     +-------------------+     +------------------+     +-------------+
| /dashboard       | <-- | /set-password     | <-- | /auth/callback   | <-- | Supabase    |
| Teacher Logged In|     | Set New Password  |     | Process Token    |     | Verifies    |
+------------------+     +-------------------+     +------------------+     +-------------+
```

---

## Implementation Steps

### Step 1: Create Auth Callback Page

Create a new file: `src/pages/AuthCallback.tsx`

This page will:
- Extract hash fragments from URL (Supabase uses `#access_token=...` format)
- Call `supabase.auth.getSession()` to establish session from URL tokens
- If valid session: redirect to `/set-password`
- If no session: show error and redirect to `/auth`
- Display loading spinner during processing

```text
Flow:
1. User lands on /auth/callback#access_token=xxx&type=recovery
2. Supabase client automatically parses hash fragment
3. getSession() returns the authenticated user
4. Redirect to /set-password
```

### Step 2: Create Set Password Page

Create a new file: `src/pages/SetPassword.tsx`

This is a simplified, dedicated page for invited teachers:
- New Password field
- Confirm Password field  
- Submit button
- Validation: passwords match, minimum 6 characters
- On submit: `supabase.auth.updateUser({ password })`
- On success: redirect to `/dashboard`

This is cleaner than repurposing the existing ResetPassword page.

### Step 3: Update Router in App.tsx

Add two new routes before the catch-all:
```text
/auth/callback → AuthCallback component (no protection)
/set-password → SetPassword component (requires active session)
```

Keep the existing `/reset-password` route for backward compatibility.

### Step 4: Update Edge Function Invite URL

Modify `supabase/functions/teacher-management/index.ts`:

Instead of building a custom URL with token parameter, use Supabase's proper redirect flow:

```text
Option A (Recommended): Use the Supabase action_link directly
- The action_link format: https://[project].supabase.co/auth/v1/verify?...&redirect_to=SITE_URL
- Configure Site URL in Supabase to: https://piyushbusiness.lovable.app/auth/callback
- Teacher clicks link → Supabase verifies → redirects to /auth/callback with session

Option B: Keep current approach but fix it
- Generate the link with redirect_to parameter
- Extract token and build frontend URL with proper handling
```

For this implementation, we'll use **Option A** since it's the standard Supabase pattern.

### Step 5: SPA Routing Configuration

For Lovable's hosting, SPA routing is automatically handled. The 404 issue is caused by missing routes, not hosting configuration.

No changes needed to vite.config.ts or public folder.

---

## File Changes Summary

| Action | File | Purpose |
|--------|------|---------|
| Create | `src/pages/AuthCallback.tsx` | Handle Supabase auth redirects, parse tokens |
| Create | `src/pages/SetPassword.tsx` | Clean password setup page for invited teachers |
| Modify | `src/App.tsx` | Add `/auth/callback` and `/set-password` routes |
| Modify | `supabase/functions/teacher-management/index.ts` | Update invite link generation to use Supabase redirect |

---

## Detailed Implementation

### AuthCallback.tsx
```text
Purpose: Token processing page (no visible UI except loading)

Logic:
1. useEffect on mount:
   - Call supabase.auth.getSession()
   - This automatically processes hash fragments from URL
   
2. If session exists:
   - Check if this is a recovery flow (user needs to set password)
   - Redirect to /set-password

3. If no session after processing:
   - Show "Invalid or expired link" message
   - Button to go to /auth

4. Loading state:
   - Show spinner while processing
```

### SetPassword.tsx  
```text
Purpose: Password setup for invited teachers

Requirements:
- Must have active session (redirect to /auth if not)
- Show password form
- Validate password match and length
- Update password via supabase.auth.updateUser()
- Redirect to /dashboard on success
```

### Edge Function Changes
```text
Current (line 203):
inviteLink = `https://piyushbusiness.lovable.app/reset-password?token=${token}&type=recovery`;

New approach:
Use generateLink with proper redirect_to:
- The Supabase action_link already includes redirect_to
- We just need to ensure Site URL is configured correctly in Supabase
- Or we override redirect_to in the generateLink call

Actually, the cleanest fix is to use the Supabase action_link as-is, 
since it will redirect to the Site URL configured in Supabase Auth settings.

The invite link will be the raw Supabase verification URL.
```

---

## Configuration Required (Manual Step)

You must set the **Site URL** in Supabase Auth settings to:

```text
https://piyushbusiness.lovable.app
```

**Location**: Supabase Dashboard → Authentication → URL Configuration → Site URL

Additionally, add to **Redirect URLs**:
```text
https://piyushbusiness.lovable.app/auth/callback
https://piyushbusiness.lovable.app/**
```

This ensures Supabase knows where to redirect after verifying the recovery token.

---

## Updated Invite Flow (After Fix)

1. Super Admin creates teacher account
2. Edge function generates Supabase verification URL
3. Super Admin copies and sends the link to teacher
4. Teacher clicks link
5. Supabase verifies token and redirects to `/auth/callback`
6. `/auth/callback` processes session and redirects to `/set-password`
7. Teacher sets password
8. Redirect to `/dashboard`

---

## Security Notes

- `/auth/callback` - Public route (needs to process redirects)
- `/set-password` - Requires authenticated session (checks in component)
- No changes to existing role-based access control
- No changes to RLS policies
