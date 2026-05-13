## Plan: Rebrand to VidyaSync

### Brand decisions (locked from clarification)
- App name: **VidyaSync** (replaces "TeachEase" everywhere)
- Tagline: **"Seekho • Sync Karo • Grow Karo"** (replaces "Ram Ram Piyush" on landing top-left)
- PDF receipt: keeps the **"Ram Ram {studentName}"** greeting already personalised per receipt; the static "Ram Ram Piyush" header text is removed and replaced with VidyaSync logo + name top-right
- Memory rule about "Ram Ram Piyush" will be updated to reflect the new tagline + per-student greeting

### 1. Logo asset
- Copy uploaded logo `user-uploads://ChatGPT_Image_May_13_2026_07_34_21_AM.png` → `src/assets/vidyasync-logo.png` (for in-app imports)
- Also copy a smaller copy → `public/vidyasync-logo.png` and `public/favicon.png` (favicon + PDF embedding via URL)
- Replace existing `public/favicon.ico` reference

### 2. Files to update (text rename + logo placement)

| File | Change |
|---|---|
| `index.html` | Title → "VidyaSync — Smart Tuition Management for Teachers"; meta description, author, OG title/description; favicon link → `/favicon.png`; add theme-color meta (deep blue) |
| `src/pages/Index.tsx` | Top-left: VidyaSync logo + "VidyaSync" wordmark + tagline "Seekho • Sync Karo • Grow Karo"; hero title "VidyaSync Dashboard" → "VidyaSync"; copy refresh to education-SaaS tone |
| `src/pages/Auth.tsx` | Card title "TeachEase Dashboard" → "VidyaSync"; replace GraduationCap icon block with logo image; subtitle copy refresh |
| `src/pages/ResetPassword.tsx` | "TeachEase account" → "VidyaSync account" |
| `src/pages/SetPassword.tsx` | Add logo above title (consistency with Auth) |
| `src/pages/AuthCallback.tsx` | Add small logo above spinner |
| `src/components/dashboard/DashboardHeader.tsx` | Replace `<h1>TeachEase</h1>` with logo + "VidyaSync" wordmark; ensure responsive (logo only on mobile, logo + wordmark on desktop) |
| `src/lib/pdfGenerator.ts` | Header: VidyaSync logo top-right + "VidyaSync" text; remove static "TeachEase Dashboard" title; keep "Ram Ram {studentName}" greeting body intact |
| `supabase/functions/teacher-management/index.ts` | Invite email subject/body copy uses "VidyaSync" (redirect URL stays — it's the deployed domain, not branding) |

### 3. Color polish (tailwind tokens — light touch only)
- Confirm `src/index.css` primary already in deep-blue range; if not, nudge `--primary` toward `hsl(217 91% 35%)` and add `--accent` cyan/teal `hsl(187 85% 43%)` and success green `hsl(152 65% 45%)` to align with logo gradient
- No component-level color changes — semantic tokens drive it

### 4. Mobile / PWA prep (lightweight, non-breaking)
- Add `<link rel="apple-touch-icon" href="/vidyasync-logo.png">` and `<meta name="apple-mobile-web-app-title" content="VidyaSync">` in `index.html`
- Note: no Capacitor config exists yet; full PWA/Capacitor setup is out of scope for this rename pass (called out in "manual steps")

### 5. Memory update
- Edit `mem://index.md` Core: replace the "Ram Ram Piyush" line with:
  > Brand: VidyaSync. Tagline "Seekho • Sync Karo • Grow Karo" on landing top-left. PDF receipts greet each student personally with "Ram Ram {studentName}".

### 6. QA pass
- `rg -i "teachease|ram ram piyush"` after edits — must return only the personalised PDF greeting and the memory note
- Verify build, visit `/`, `/auth`, `/dashboard`, `/reset-password`, generate a PDF receipt, confirm logo + branding render at retina sizes

### Out of scope (manual steps to flag at the end)
- Real Capacitor `capacitor.config.ts` (none in repo today) — only needed if user wants native build
- Generating a proper transparent SVG logo + multi-size PWA icons (current PNG will be used as-is)
- Renaming the deployed Lovable subdomain `piyushbusiness.lovable.app` → `vidyasync.lovable.app` (done in Lovable publish settings, not code)

### Deliverables after implementation
1. List of files changed
2. Remaining manual steps (Capacitor config, subdomain rename, optional SVG logo)
3. Any extra assets still needed (icon set for PWA / app stores if mobile path is taken)
