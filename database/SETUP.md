# Dedicated database setup (not yet deployed)

1. Create a **new** Supabase project. Never run this SQL on the existing My Solution Colombo or attendance databases.
2. Review and run `database/schema.sql` in the new project's SQL editor.
3. Add only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to your private deployment environment.
4. Create staff accounts using the Supabase Auth dashboard. A trusted database administrator must provision `public.profiles` rows with the corresponding auth user IDs and explicitly set `active=true` and the intended `role`. Never allow users to self-assign roles.
5. Check RLS with three distinct test users (admin, office, technician), including a technician attempting to read a job assigned to another technician.
6. Do not enable production until permissions, build, session handling and full workflows are tested.

## Current limitations
The UI is a starter dashboard. Job creation forms, file uploads, job completion workflows, and reporting remain to be implemented. No real database or live login has been tested.
