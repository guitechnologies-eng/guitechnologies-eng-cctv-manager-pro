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
- [x] Staff creation action validates username, 12+ char password and roles; Office/Admin roles only.
- [x] Login fallback computes username-derived internal Supabase Auth identity; existing `guiadmin` alias still uses its original email/password.
- [x] Preview Next.js build and TypeScript checks pass; automated username resolver tests pass.
- [x] Existing customers/jobs remain untouched; no Assign Technician or Customer WhatsApp options introduced.
- [ ] An authenticated Admin must actually create a test staff account in the live UI and verify the new user can sign in. Real Admin credentials were not available to automated tools.
- [ ] Verify user password recovery/rotation through a future secure admin workflow; synthetic internal email identities cannot receive password-reset emails.
