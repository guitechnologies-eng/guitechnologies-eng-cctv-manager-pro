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
