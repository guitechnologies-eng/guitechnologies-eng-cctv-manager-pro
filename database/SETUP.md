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

## Username + password sign-in

- The login form accepts a **username**, not a Gmail/email address. The existing Supabase Auth email identity and password remain unchanged.
- Set `CCTV_LOGIN_ALIASES_JSON` as an **encrypted, server-only** Vercel project environment variable for the dedicated CCTV app (never use the `NEXT_PUBLIC_` prefix). Example: `{"guiadmin":"admin@your-business.example"}`; replace the sample email with the user's existing, confirmed Supabase Auth account.
- Usernames are lowercase/case-insensitive (3-32 ASCII letters, digits, periods, underscores and hyphens; first character must be a letter).
- The server action uses Supabase password login for the original Admin alias, or a rate-limited Supabase Edge PIN verification for newer staff accounts. The browser sees Username + Password/PIN and generic errors. No Supabase Auth account, password, or business data is migrated.
- To enable another staff member, use the Admin-only Staff Management form. The encrypted username-to-email mapping remains necessary for the original Admin account only.
- Existing passwords remain valid. The underlying email account remains necessary for administrative account recovery.
- If the encrypted alias mapping is missing, the original Admin password login fails closed; the separate staff PIN service can still authenticate existing staff usernames.
- Ensure Vercel secrets are visible only to authorized project administrators, and do not expose usernames/emails through client bundles or debug output.

## Admin-created user logins (20 Nov 2026)

- **Staff Management** is available at `/staff` to active Administrators only.
- Admins enter a full name, unique 3-32 character username, numeric PIN (4-8 digits) and a role (`Office Staff` or `Admin`). Office Staff can manage service jobs; Admin can additionally create staff users.
- `public.staff_accounts` stores a unique username, Supabase Auth user UUID and creator reference. It does **not** store passwords. Its RLS allows SELECT to active Admin only; direct INSERT/UPDATE/DELETE grants are revoked from normal web users.
- An authenticated Admin Server Action uses the Supabase Edge Function `admin-create-staff`. The function validates the caller's JWT and active Admin role **again**, then creates a Supabase Auth account using the secret key provided by the Supabase Edge environment. The secret key is never shipped to browsers or Vercel.
- The new Auth identity uses the server-internal deterministic address `<username>@staff.cctv-manager-pro.invalid`; staff type **only their username** into the browser. It is not a real mailbox, so email-based password recovery is unavailable for these accounts. Password management is administrator-managed until a secure password reset feature is built.
- Existing `guiadmin` keeps the original Supabase Auth email/password identity; the encrypted Vercel `CCTV_LOGIN_ALIASES_JSON` value continues to resolve it. Adding new usernames does **not** require Vercel environment edits.
- New staff account provisioning is limited to Admin/Office roles. Technician assignment UI is still intentionally excluded. No customer WhatsApp messages are sent.
- Apply `database/migrations/20261120_admin_staff_accounts.sql` on the dedicated CCTV database only. Deploy `supabase/functions/admin-create-staff/index.ts` to the **same** Supabase project with the function's own JWT verification enabled in code. Verify it is active before exposing the `/staff` UI.
- The Edge Function may use `verify_jwt=false` at the gateway because it verifies the supplied user's Bearer token with Supabase Auth `getUser` and checks the active Admin role before any privileged operation.
- Admin should privately share each new staff member's initial PIN. Do not paste passwords into chat or store them in a customer/job note.
- Real end-to-end staff creation requires an authorized Admin to sign in and submit a test user, confirm username login, then manage that test user according to policy. Automated tests verify username mapping, RLS and application builds, but do not impersonate the Administrator or use their password.

## Staff numeric PIN login (20 November 2026)

- Admin /staff creates **4-8 digit numeric PIN** accounts instead of initial text passwords. Recommend a random 6-8 digit PIN; 1234, 0000 and birthdays are easy to guess.
- Admin-created staff enter username plus PIN at /login. The original guiadmin keeps its existing password.
- PINs are never stored as plaintext in customer/job tables. The Edge functions derive a strong Supabase Auth password with HMAC-SHA256 and a random pepper encrypted in Supabase Vault. The pepper is accessible only to a service-role RPC. Supabase Auth stores its usual salted password hash.
- staff-pin-login runs server-to-server from a Next.js Server Action, with 5 attempts per 30 minutes per username. A successful login resets the counter.
- The Edge function returns Auth session tokens over HTTPS to the Server Action, which sets cookies. The PIN is never put in a URL.
- Deploy admin-create-staff and staff-pin-login with functions/_shared/pin-auth.ts included beside the entrypoints.
- Apply database/migrations/20261120_staff_pin_login.sql only to the dedicated CCTV database; it creates a Vault secret once and rate-limit functions.
- Do not rotate the encrypted Vault pepper until staff PINs are re-enrolled; existing derived Auth credentials would stop matching.
- Existing Admin Auth account/password and all customer/job data remain untouched. Existing old-style password staff accounts, if any, are not automatically migrated.
- Even with lockouts, short PINs are less safe than long passwords. Prefer 6-8 digits, keep them private, and use MFA for sensitive Admin access.
- PIN reset and staff account disabling are separate features not included in this update.

## Shop Staff and Technician roles (20 Nov 2026)

- The actual team consists of **Shop Staff** and **Technicians**, with an additional **Admin** role for managing staff.
- Role `office` is displayed as **Shop Staff** to retain database compatibility and all existing permissions.
- Shop Staff may create/edit customers, new jobs, job status, follow-up schedule and progress notes.
- Technicians may **view all service jobs and customer contact details**, read service history and add progress notes.
- Technicians cannot create/edit customers or jobs, change workflow status, schedule visits, or add staff accounts. Staff PIN login permits technician role.
- No Assign Technician UI or job assignment is required; technicians see the shared job queue.
- The Admin-only Staff Management form accepts Shop Staff, Technician and Admin roles. Admins should only grant Admin to fully trusted staff.
- Apply database/migrations/20261120_shop_staff_technician_roles.sql on the dedicated CCTV database only.
- The migration changes only SELECT/INSERT RLS policies, not existing customer/job/profile rows. Auth and Edge functions independently enforce Admin-only creation.
- Test in transaction by temporarily changing a known Admin role to technician, confirming reads/notes allowed and edits denied, then ROLLBACK.

## Admin can edit existing staff (20 Nov 2026)

- Admin-only `/staff` directory now includes an **Edit User** panel for previously added staff.
- Admin may edit **Full Name, Role (Shop Staff/Technician/Admin), Active/Inactive**, and **reset PIN** for PIN-based staff.
- Username is intentionally **not editable** in this release: it is linked to the staff's Supabase Auth identity and PIN-derived credential.
- Profile fields are saved atomically using `public.cctv_admin_edit_staff` after the Edge function validates an active Admin JWT; the database function additionally verifies the Admin role, locks edits, protects the last active Admin, and prevents self-demotion or self-deactivation.
- `admin-manage-staff` Edge Function resets a PIN using the existing Supabase Vault pepper and Supabase Auth `admin.updateUserById` API. It never returns PINs to the browser.
- The original `guiadmin` password-based login cannot be reset through the new PIN control. Existing sessions may continue until expiry, but account deactivation blocks business-data access through current RLS.
- Apply `database/migrations/20261120_admin_edit_staff.sql` only on the dedicated CCTV Manager Pro project. Deploy `admin-manage-staff` with `_shared/pin-auth.ts` and `_shared/staff-edit-rules.ts`.
- Existing customer/job records, current usernames, technician assignment UI (removed), and customer WhatsApp messaging remain untouched.
- Automated tests verify input validation and production builds; secure SQL tests verify role restrictions with `ROLLBACK`. Actual PIN reset must be verified privately by an authorized Admin.

## Dashboard speed and smoothness improvements (20 Nov 2026)

- Display only **12 service Job Cards per dashboard page**, with Next/Previous controls; Search/Status/Section filters carry across pages. This prevents hundreds of editor forms/WhatsApp previews being rendered in a single response.
- Reminders link to the associated job using its unique Job Reference in a search, so it remains findable after pagination.
- Latest progress notes use the dedicated `public.latest_job_updates` security-invoker view and only read notes for jobs on the current page. The former 1000-row history query is removed. The view respects per-role RLS.
- Protected routes use `getClaims()` during session refresh in Next.js 15 middleware, following Supabase SSR guidance; pages still verify current user/profile and role.
- In-progress Save buttons disable repeated submits and give immediate feedback; a lightweight Dashboard loading skeleton makes navigation more responsive.
- Existing features, job data, Customer Auto-Add, reminders, staff roles, service history and team-only WhatsApp remain unchanged. **Assign Technician** and **Customer WhatsApp** are not added.
- This is a performance-focused layout/query optimization, not a data migration or rewrite. The existing dashboard fetch cap of 200 jobs remains until a future full server-side search/pagination enhancement.
- To reapply, deploy `database/migrations/20261120_latest_updates_perf.sql` to the **dedicated CCTV project only**; verify the view has `security_invoker=true` and unauthorized staff see no notes.
- Unit tests cover paging, filter links, 17-job two-page navigation, invalid page values and reminder link encoding. Verify actual PC/mobile authenticated responsiveness manually.


## Assign Technician (20 Nov 2026)

- On the **Admin/Shop Staff dashboard**, open a service job → **Manage Job → Assign Technician**. Choose an active Technician and click Save. Reassign by choosing another person or select Unassigned to remove the assignment.
- Each job supports **one currently assigned Technician**; the existing `job_assignments` table is retained (no jobs or customers recreated). Assignment changes are serialized per job and audited once per change in `job_history` (visible in Service History).
- Technicians default to the **My Assigned Jobs** filter but can switch to **All Service Jobs** (the previous shared queue remains visible). Shop Staff can filter **Unassigned** or by technician. Page navigation preserves these filters.
- Only active Admin/Shop Staff can assign. The `assign_job_technician` database RPC verifies their role, ensures that selected technician is active, and writes atomically. Direct INSERT/DELETE for browser users is revoked to ensure audit trails.
- Assigning does **not** automatically change the workflow status. Status remains a separate Admin/Shop Staff action.
- New Job creation stays unchanged: create the job, then use its Assign Technician editor. Team-only WhatsApp sharing remains manual; no Customer WhatsApp feature is introduced.
- Apply `database/migrations/20261120_assign_technician.sql` **only to dedicated CCTV project**. It adds a unique job assignment index, the audited RPC, and expands the allowed job history event type without changing customer/job rows.
- Tests cover assign, repeat assign (no double audit), reject non-technician, unassign, technician visibility and denial of mutation, and My Assigned Jobs filter/pagination. SQL tests are wrapped in ROLLBACK.
- Authorized Admin/Shop Staff should still verify assignment changes in a real browser using existing accounts; no credentials are requested or stored by tests.
