# Two Technicians on One Job — CCTV Manager Pro

## Staff workflow
1. Open **Dashboard → Service Requests → Manage job**.
2. Choose **Technician 1** and optionally **Technician 2**.
3. Click **Save Technician Assignments** once. The same person cannot be chosen twice.
4. Both selected, active technicians see the job in their **My Jobs** phone screen. A push is queued for each newly added technician who has enabled job notifications.
5. Either assigned technician can start or complete the shared job. Completion is **immediate** and closes that job for both technicians, with **no Admin approval**.
6. Saving one technician removes the second assignment; saving neither unassigns the job. Unchanged technician memberships remain preserved on re-save.

## Release requirement — LIVE DATABASE MIGRATION FIRST
The live database is in the **Guit2004** Supabase account, project **cctv-manager-pro**:
`mxurrjcrdgsikrtmpipy`.

The currently connected Supabase account does **not** grant access to this project. Do **not** apply this migration to `my-solution-colombo` or `attendance-salary-management`. Do **not** release the UI to production until migration verification succeeds.

1. Connect the correct dedicated project and check that it is healthy.
2. Take a verified database backup/snapshot. Confirm schema and the current number of `job_assignments` and `assignment_push_deliveries` rows.
3. Apply `database/migrations/20261123_two_technicians_per_job.sql` to the dedicated CCTV Supabase project **only**.
4. Confirm the job assignment primary key remains `(job_id,technician_id)`, the one-tech-only unique index is gone, the notification FK references `public.jobs`, the new RPC is restricted to authenticated users, and all prior assignments remain.
5. Run `tests/two-technicians-per-job.sql` in an intentionally rolled-back transaction on the dedicated project. Verify role protection, idempotency, dual visibility, notification queue behavior, and immediate completion.
6. Only then merge the UI feature branch and deploy to Vercel production. Run a live mobile test with two authorized technicians, test notification opt-in separately, and ensure both see the assigned job.
7. Check production runtime errors and retain an app rollback plan. Database schema may need a forward-fix (not a blind rollback) after live assignment of two technicians.

### Data integrity
- A single atomic RPC saves the full selected team; partial saves cannot leave a job with one technician by accident.
- The original one-technician RPC will reject attempts to overwrite a two-technician job made by cached old clients.
- The notification delivery queue keeps records for unchanged technicians, while pending deliveries for removed technicians are cancelled.
- Job/customer data and service history are not seeded, deleted or reset.
- No customer WhatsApp options are added.
