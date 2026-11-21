# Technician Mobile Workflow – CCTV Manager Pro

## Technician phone experience
- Phone app entry: `/technician`; authenticated Technicians are automatically redirected here from `/dashboard`. On first login, Username + PIN opens the mobile dashboard.
- `/technician` lists **My Jobs**, active / completed counts and calls to the saved customer number. Technicians can open assigned jobs only.
- `/technician/jobs/[id]` displays assigned job details and recent service history. Large **Start Job** and **Mark Completed** actions support an optional progress note.
- Pressing **Mark Completed** updates the job status to **Completed immediately**, with **no Admin approval**. Status changes are recorded by the existing audit trigger; notes are saved in job updates.
- `/technician/lodging` provides accommodation records: optional assigned job, stay date, place, nights, optional cost (LKR), and notes. A technician can read/create their own lodging entries. Admin / Shop Staff may read for oversight.
- `/technician/loading.tsx` provides a lightweight branded loading state. The app continues to require an internet connection.

## Security
- Role checked on every phone route and every Server Action using verified Supabase Auth session and active profile.
- The status transition RPC `technician_set_job_progress` verifies active Technician role and checks current job assignment **after locking the job row**, avoiding race conditions during reassignment. Allowed actions: `start`, `complete`. Cancelled/closed jobs cannot be modified.
- A narrow change to the existing private audit trigger allows only **assigned technician, status-only, pending/assigned/in-progress → in-progress/completed** changes. Technicians still cannot directly update `jobs` or edit customer details.
- Lodging table has RLS: read own for Technicians (Admin/Shop Staff read), insert own only with optional job assigned to self, no update/delete permissions to ordinary staff.
- Existing job history, customers, technician assignments, auth and records are preserved.

## Notifications
- The existing dedicated Web Push implementation continues. `TechnicianNotifications` appears in mobile My Jobs when VAPID configuration is available.
- Technicians must tap **Enable job alerts** in the installed app and grant phone/browser permission. Assignment saves enqueue and attempt delivery to subscribed assigned technician devices only, never customers.
- Web Push requires compatible platform support, HTTPS, enabled notification permissions and connectivity. No guaranteed delivery is claimed without device testing.
- The service worker opens `/jobs/{id}`; assigned technician can view relevant job details. Future customization can route it to mobile job details.

## Quality and verification
- Run `npm test` (includes pure mobile validation tests) and Next.js TypeScript/build checks.
- Security tested in a rollback-only SQL transaction impersonating an actual active Technician with an assigned job. Verified: Start → In Progress; Complete → Completed without approval; notes and audit recorded; unassigned status edits denied; own lodging insert/read permitted. All QA writes were rolled back.
- Real on-device test requires Technician Username/PIN and phone permission. Do not share credentials here.

## Migration
Apply `database/migrations/20261121_technician_mobile_workflow.sql` on the **dedicated CCTV Manager Pro Supabase project only**. It is additive and safe to reapply. Never apply this migration to MY Solution Colombo or unrelated projects.
