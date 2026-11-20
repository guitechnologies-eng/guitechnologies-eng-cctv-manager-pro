-- CCTV Manager Pro only. No existing customer/job/profile data is changed.
-- Display "Shop Staff" for existing role "office"; "Technician" uses existing role enum.
-- Without Assign Technician UI, all active technicians can view all jobs and add progress notes.
DROP POLICY IF EXISTS customers_read ON public.customers;
CREATE POLICY customers_read ON public.customers FOR SELECT TO authenticated
 USING ((select private.current_role()) IN ('admin','office','technician'));
DROP POLICY IF EXISTS jobs_read ON public.jobs;
CREATE POLICY jobs_read ON public.jobs FOR SELECT TO authenticated
 USING ((select private.current_role()) IN ('admin','office','technician'));
DROP POLICY IF EXISTS updates_read ON public.job_updates;
CREATE POLICY updates_read ON public.job_updates FOR SELECT TO authenticated
 USING ((select private.current_role()) IN ('admin','office','technician'));
DROP POLICY IF EXISTS updates_insert ON public.job_updates;
CREATE POLICY updates_insert ON public.job_updates FOR INSERT TO authenticated
 WITH CHECK (author_id=(select auth.uid()) AND (select private.current_role()) IN ('admin','office','technician'));
DROP POLICY IF EXISTS job_history_read ON public.job_history;
CREATE POLICY job_history_read ON public.job_history FOR SELECT TO authenticated
 USING ((select private.current_role()) IN ('admin','office','technician'));
-- Existing role checks for customer/job inserts, edits, schedule and status remain Admin/Shop Staff only.
NOTIFY pgrst,'reload schema';
