# CCTV Manager Pro – Security & Workflow Testing

## Verified by automated / database tests on dedicated CCTV project (18 Nov 2026)

- [x] Dedicated CCTV project data counts checked: 16 customers and 16 jobs.
- [x] Anonymous database roles lack direct access to private service-history data.
- [x] Authenticated unknown account cannot read jobs, customers, or service history (RLS read-only transaction).
- [x] Admin can edit reminder dates and notes and create an auditable history event (all within a rolled-back transaction).
- [x] Job status changes and customer edits generate service history (rolled-back test).
- [x] Progress notes appear in the unified history view (rolled-back test).
- [x] New customer + job creation works and duplicate matching reuses an existing customer (rolled-back test).
- [x] All temporary customer/job/status changes rolled back; no QA records remain.
- [x] Seven Sri Lanka timezone + reminder categorization unit tests pass as part of the build.
- [x] Production Next.js build passes tests and TypeScript validation.
- [x] Logged-out requests to dashboard and job history are redirected to login.
- [x] No Assign Technician or WhatsApp Customer UI reintroduced; internal team WhatsApp action requires a click.
- [x] Staff reminder editing uses existing authenticated Admin/Office checks and jobs RLS.

## Still requires an authorized human / separate account to test

- [ ] Real PC login, dashboard access and logout using the account's password. Do not send passwords to chat.
- [ ] Real mobile browser login and touch interactions.
- [ ] Real authenticated form submissions for New Job, Customer Auto-Add, Status Edit, Service Notes and Reminder Save.
- [ ] WhatsApp opening the **correct team chat**, and manual sharing; no customer messaging.
- [ ] Separate real Admin, Office, and Technician accounts exercising every role access path.
- [ ] Check Supabase Auth leaked-password-protection configuration (Security Advisor warning, if applicable).

## Reminders

- In-Dashboard only: Pending / Due Today / Overdue / Upcoming 7 Days.
- Date/time uses Asia/Colombo with explicit timezone conversion.
- No automatic customer messages, push notifications, or staff assignment.
- Existing business projects My Solution Colombo / Attendance Salary are out of scope.

## Repeat tests

- `npm test` – automated unit tests.
- `npm run build` – unit tests and full Next.js production build.
- Always use a dedicated project and wrap data mutation tests in `BEGIN` / `ROLLBACK`.

## Username login verification (20 Nov 2026)

- [x] Existing confirmed, active Admin Supabase Auth account found. Password not changed.
- [x] Login UI uses `name="username"` and `name="password"`, no browser email field.
- [x] Server-side mapping stored in encrypted Vercel `CCTV_LOGIN_ALIASES_JSON` (no `NEXT_PUBLIC_` prefix).
- [x] No user-facing disclosure of the mapped email; unknown username and wrong password show the same generic credentials message.
- [x] Username resolver rejects invalid, missing, malformed and unlisted aliases.
- [x] Unit tests on preview deployment pass; Next.js build/typecheck pass.
- [ ] Authorized staff must still perform an actual username/password login on desktop and mobile; do not share passwords in chat.
- [ ] Test staff account provisioning before using additional username aliases in production.

## Admin-managed staff account creation (20 Nov 2026)

- [x] Admin username `guiadmin` registered in RLS-protected directory without changing original Supabase Auth identity.
- [x] Only verified active Admin may access `/staff`; logged-out clients are redirected to `/login`.
- [x] `public.staff_accounts`: RLS enabled; authenticated users cannot INSERT or UPDATE directly; anonymous clients cannot SELECT.
- [x] Privileged user creation runs inside Supabase Edge Function, not browser or Vercel; service role key comes from Supabase's Edge environment.
- [x] Edge Function verifies bearer JWT with Supabase Auth and active Admin profile before privileged operations.
- [x] Staff creation action validates username, 4-8 digit numeric PIN and roles; Office/Admin roles only.
- [x] Login fallback computes username-derived internal Supabase Auth identity; existing `guiadmin` alias still uses its original email/password.
- [x] Preview Next.js build and TypeScript checks pass; automated username resolver tests pass.
- [x] Existing customers/jobs remain untouched; no Assign Technician or Customer WhatsApp options introduced.
- [ ] An authenticated Admin must actually create a test staff account in the live UI and verify the new user can sign in. Real Admin credentials were not available to automated tools.
- [ ] Verify user password recovery/rotation through a future secure admin workflow; synthetic internal email identities cannot receive password-reset emails.

## PIN login security checks (20 November 2026)

- [x] PIN input accepts 4-8 numeric characters; leading zeros preserved.
- [x] PINs are converted to non-reversible 70-character Supabase Auth credentials using HMAC-SHA256 and a 32-byte Vault secret.
- [x] No plaintext staff PIN stored in public customer/job/staff tables.
- [x] Vault pepper RPC accessible only to service_role; anon and authenticated have no EXECUTE permission.
- [x] Server-only per-username limit prevents more than 5 PIN login attempts per 30-minute window; SQL test used ROLLBACK.
- [x] Existing guiadmin password flow is left unchanged.
- [x] New staff PIN login uses dedicated Edge authentication and sets session cookies through the Next.js Server Action.
- [ ] Authorized Admin must create a real PIN-based staff account and test sign-in; no Admin password has been supplied to the assistant.
- [ ] Admin-managed PIN change/reset UI is a separate next step; synthetic email aliases cannot receive recovery email.

## Shop Staff & Technician Roles

- [x] Admin can create Shop Staff (`office`) and Technician (`technician`) users with PIN; Edge role checks support both.
- [x] Technician PIN login accepts the `technician` role while still checking active profile and matching staff account.
- [x] Technician sees the shared service queue; no per-technician assignment required.
- [x] Read-only transaction verifies technician access to jobs, customers and service history, plus progress note insertion.
- [x] Transaction verifies technician cannot update jobs or insert customers; test data/role changes rolled back.
- [x] Existing Admin, Shop Staff edit privileges unchanged.
- [ ] Manual Admin create-user flow and Technician login must be validated by authorized users with private credentials.

## Editing previously created staff

- [x] Staff profile changes allowed only to authenticated, active Admins at both Next.js Server Action and Supabase Edge function.
- [x] SQL RPC executable only by service_role; anon/authenticated have no direct EXECUTE access.
- [x] SQL transaction checks and locks prevent the last active Admin from being deactivated or demoted.
- [x] Admins cannot deactivate or demote themselves through Staff Management.
- [x] Name, role and status edit tests completed in rolled-back SQL transaction; existing records preserved.
- [x] PIN reset is restricted to Auth accounts using the synthetic PIN-based identity and never changes the original guiadmin password.
- [x] New PIN is pepper-derived in Supabase Edge and updated using Auth Admin API; staff usernames remain immutable.
- [ ] Authorized Admin must test Edit User and PIN reset in a real signed-in browser; no PIN or password should be supplied in chat.

## Dashboard performance / RLS checks (20 November 2026)

- [x] New `latest_job_updates` is `security_invoker=true`, index backed, and caller RLS enforced.
- [x] Unknown authenticated identity cannot read any progress notes from the view (SQL read-only transaction).
- [x] Latest-note correctness checked under authorized Admin role (SQL read-only transaction).
- [x] Dashboard paginates **12 job cards per page**, while summary/reminders still use the loaded jobs.
- [x] URL filters and reminder search targets preserved by pagination tests.
- [x] Save buttons use a pending state to discourage duplicate clicks.
- [x] Next.js 15 middleware follows Supabase SSR `getClaims` guidance for session validation; page-level user/profile checks remain in place.
- [ ] An authorized staff account should verify real PC/mobile speed, search, next/previous, share-to-team previews, reminder links and forms.
- [ ] Monitor authenticated dashboard latency and Vercel Web Vitals after enough genuine traffic; no speed improvement percentage is claimed without a baseline.
