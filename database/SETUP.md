# CCTV Manager Pro - dedicated database setup

## Live project
- Supabase account: Guit2004; project: `cctv-manager-pro` (`mxurrjcrdgsikrtmpipy`)
- Live site: https://cctv-manager-pro.vercel.app
- This is NOT `my-solution-colombo` or `attendance-salary-management`; do not modify those systems.

## Fresh project setup (not for an existing live database)
1. Create a separate Supabase project.
2. Apply `database/schema.sql` once.
3. Apply `database/migrations/20261118_service_manager_v2.sql` once.
4. Apply `database/migrations/20261118_atomic_new_job_customer.sql` once on the same dedicated database.
5. Apply `database/migrations/20261118_internal_reminders.sql` once.
6. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` on Vercel. Never expose secret/service-role keys.
7. Provision profiles for registered users via a trusted administrator; never let users self-assign roles.
8. Test admin/office/technician RLS, authentication, status edits, service history and WhatsApp share links.

## V2 features / security
- Job reason, type, priority, section, description and optional per-job site-address editing.
- `public.job_history` has RLS and is read-only to clients. Restricted internal triggers audit future changes.
- `public.service_history` is a `security_invoker` view merging progress notes with job/customer change history.
- History is paginated, including author/time. Activity that was never recorded cannot be reconstructed.
- WhatsApp opens only when the staff member clicks the share link. No automatic messages are sent.
- The Assign Technician form is intentionally removed.
- Do not delete or reseed existing 16 customer and 16 job records.
- Real password-based end-to-end login still requires an authorized user to test privately.

## New Job customer workflow
- Search and select an existing customer by name, phone or place, or enter a new customer directly inside the New Job form.
- New customer and job are saved atomically via `public.create_job_with_customer`. If creating either fails, the transaction is rolled back.
- Customer identity is checked using normalized phone number. A matching name/phone reuses an existing customer, while conflicting phone owners require manual customer selection.
- Both the RPC and ordinary form actions require active admin/office permissions and existing RLS policies. No duplicate seeding or destructive changes are needed.

## Internal team reminders (dashboard-only)

- Pending jobs with no date show as **Pending – Schedule Needed**. Overdue, Due Today, and Next 7 Days use Asia/Colombo calendar dates.
- For a job, choose **Set / Edit Internal Reminders** and enter optional Visit Date/Time, Next Follow-up Date/Time and Internal Reminder Note; save to the dedicated CCTV database.
- Completed and cancelled jobs are excluded from active reminders. Follow-up and visit dates remain in history until edited.
- All reminder changes are recorded in the existing secure service-history audit table.
- Alerts are generated when team staff opens or refreshes the dashboard. There are **no automatic/push notifications, no customer messages and no technician assignment**.
- The app uses an idempotent additive migration; existing customer/job rows are not seeded or modified.

## Test coverage

- Run `npm test` for the Sri Lankan time conversion, overdue/today/upcoming handling, validation, status suppression and no-duplicate-alert tests.
- `npm run build` automatically runs tests before the production Next.js build.
- On the **dedicated** Supabase project, use a rolled-back transaction to test status, reminder edits, history, customer auto-add/deduplication and progress notes without leaving sample data.
- Verify anonymous / unknown-user RLS and the production login redirect.
- A real human must still verify password-based login, form saves, mobile interaction, sign out, and WhatsApp chat selection in a browser.
