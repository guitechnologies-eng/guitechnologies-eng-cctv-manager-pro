-- CCTV Manager Pro ONLY (Supabase project mxurrjcrdgsikrtmpipy).
-- Allows up to two distinct, active technicians on one job with atomic assignments.
-- Never run on MY Solution Colombo or attendance-salary-management.
-- Existing customers, jobs, history, assigned technicians and notifications are preserved.
--
-- Important: assignment_push_deliveries(job_id) currently references a UNIQUE(job_id)
-- on job_assignments. Redirect that FK to jobs before dropping the one-tech unique index.
-- Existing queued notifications continue to reference their original jobs.

DO $migration$
DECLARE v_fk record;
BEGIN
 IF to_regclass('public.assignment_push_deliveries') IS NULL THEN
  RAISE EXCEPTION 'Apply CCTV assignment-web-push migration before two-technician migration';
 END IF;
 FOR v_fk IN
  SELECT c.conname
  FROM pg_catalog.pg_constraint c
  WHERE c.conrelid='public.assignment_push_deliveries'::regclass
    AND c.confrelid='public.job_assignments'::regclass
    AND c.contype='f'
 LOOP
  EXECUTE format('ALTER TABLE public.assignment_push_deliveries DROP CONSTRAINT %I',v_fk.conname);
 END LOOP;
 IF NOT EXISTS (
  SELECT 1 FROM pg_catalog.pg_constraint c
  WHERE c.conrelid='public.assignment_push_deliveries'::regclass
    AND c.conname='assignment_push_deliveries_job_jobs_fkey'
 ) THEN
  ALTER TABLE public.assignment_push_deliveries
   ADD CONSTRAINT assignment_push_deliveries_job_jobs_fkey
   FOREIGN KEY(job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;
 END IF;
END $migration$;

DROP INDEX IF EXISTS public.job_assignments_one_technician_per_job;
-- The existing composite PRIMARY KEY(job_id, technician_id) remains intact:
-- no technician can be assigned twice to the same job.

CREATE OR REPLACE FUNCTION public.assign_job_technicians(
 p_job_id uuid,
 p_technician_ids uuid[] DEFAULT ARRAY[]::uuid[]
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $function$
DECLARE
 v_actor uuid := (SELECT auth.uid());
 v_ids uuid[] := coalesce(p_technician_ids, ARRAY[]::uuid[]);
 v_job_id uuid;
 v_before text;
 v_after text;
BEGIN
 IF v_actor IS NULL OR NOT coalesce((SELECT private.current_role()) IN ('admin','office'),false) THEN
  RAISE EXCEPTION 'Only Admin and Shop Staff may assign technicians' USING ERRCODE='42501';
 END IF;
 IF p_job_id IS NULL THEN
  RAISE EXCEPTION 'A valid job is required' USING ERRCODE='22023';
 END IF;
 IF cardinality(v_ids)>2 THEN
  RAISE EXCEPTION 'Choose at most two Technicians' USING ERRCODE='22023';
 END IF;
 IF EXISTS(SELECT 1 FROM unnest(v_ids) AS t(id) WHERE t.id IS NULL)
 OR (SELECT count(DISTINCT t.id) FROM unnest(v_ids) AS t(id))<>cardinality(v_ids) THEN
  RAISE EXCEPTION 'Choose two different Technicians' USING ERRCODE='22023';
 END IF;

 -- Consistent lock order with technician_set_job_progress.
 SELECT j.id INTO v_job_id FROM public.jobs j WHERE j.id=p_job_id FOR UPDATE;
 IF NOT FOUND THEN
  RAISE EXCEPTION 'Job not found' USING ERRCODE='22023';
 END IF;

 IF (SELECT count(*) FROM public.profiles p
     WHERE p.id=ANY(v_ids) AND p.active=true AND p.role='technician')<>cardinality(v_ids) THEN
  RAISE EXCEPTION 'Choose an active Technician' USING ERRCODE='22023';
 END IF;

 -- Idempotent: do not send duplicate notifications or write duplicate history.
 IF (SELECT count(*) FROM public.job_assignments a WHERE a.job_id=p_job_id)=cardinality(v_ids)
 AND NOT EXISTS(
  SELECT 1 FROM public.job_assignments a
   WHERE a.job_id=p_job_id AND NOT(a.technician_id=ANY(v_ids))
 ) THEN
  RETURN;
 END IF;

 SELECT string_agg(coalesce(p.full_name,'Unknown'),', ' ORDER BY a.assigned_at,a.technician_id)
 INTO v_before FROM public.job_assignments a
 LEFT JOIN public.profiles p ON p.id=a.technician_id WHERE a.job_id=p_job_id;

 -- Since the delivery table now refers directly to jobs, explicitly drop queued
 -- deliveries belonging only to removed technicians. Keep the other technician's queue.
 DELETE FROM public.assignment_push_deliveries d
 USING public.technician_push_subscriptions s
 WHERE d.job_id=p_job_id AND d.subscription_id=s.id
  AND NOT(s.technician_id=ANY(v_ids));

 DELETE FROM public.job_assignments a
 WHERE a.job_id=p_job_id AND NOT(a.technician_id=ANY(v_ids));

 -- Insert only newcomers: existing assignments and their queued push stay intact.
 INSERT INTO public.job_assignments(job_id,technician_id,assigned_by)
 SELECT p_job_id,t.id,v_actor FROM unnest(v_ids) AS t(id)
 WHERE NOT EXISTS(
  SELECT 1 FROM public.job_assignments a
  WHERE a.job_id=p_job_id AND a.technician_id=t.id
 );
 -- The existing AFTER INSERT trigger queues notifications for each new technician.

 SELECT string_agg(coalesce(p.full_name,'Unknown'),', ' ORDER BY a.assigned_at,a.technician_id)
 INTO v_after FROM public.job_assignments a
 LEFT JOIN public.profiles p ON p.id=a.technician_id WHERE a.job_id=p_job_id;

 INSERT INTO public.job_history(job_id,actor_id,event_type,details)
 VALUES(p_job_id,v_actor,'technician_assignment',
  'Assigned technicians: '||coalesce(v_before,'Unassigned')||' -> '||coalesce(v_after,'Unassigned'));
END
$function$;

REVOKE ALL ON FUNCTION public.assign_job_technicians(uuid,uuid[]) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.assign_job_technicians(uuid,uuid[]) TO authenticated;

-- Backward-compatible old one-tech RPC: do not silently erase a two-person team
-- if an older cached client submits the previous assignment form.
CREATE OR REPLACE FUNCTION public.assign_job_technician(p_job_id uuid,p_technician_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $function$
DECLARE v_job_id uuid;
BEGIN
 IF (SELECT auth.uid()) IS NULL OR NOT coalesce((SELECT private.current_role()) IN ('admin','office'),false) THEN
  RAISE EXCEPTION 'Only Admin and Shop Staff may assign technicians' USING ERRCODE='42501';
 END IF;
 SELECT j.id INTO v_job_id FROM public.jobs j WHERE j.id=p_job_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Job not found' USING ERRCODE='22023'; END IF;
 IF (SELECT count(*) FROM public.job_assignments a WHERE a.job_id=p_job_id)>1 THEN
  RAISE EXCEPTION 'Use two-technician assignment editor for this job' USING ERRCODE='22023';
 END IF;
 PERFORM public.assign_job_technicians(
  p_job_id,
  CASE WHEN p_technician_id IS NULL THEN ARRAY[]::uuid[] ELSE ARRAY[p_technician_id] END
 );
END
$function$;
REVOKE ALL ON FUNCTION public.assign_job_technician(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.assign_job_technician(uuid,uuid) TO authenticated;

-- RLS policies based on EXISTS(job_id, technician_id) already authorize both
-- assignees independently. Job completion remains immediate, with no Admin approval.
NOTIFY pgrst,'reload schema';
