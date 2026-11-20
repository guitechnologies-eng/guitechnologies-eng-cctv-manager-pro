-- CCTV Manager Pro only: one technician per job, audited changes via RLS-checked RPC.
-- Existing customer/job records are not modified.
CREATE UNIQUE INDEX IF NOT EXISTS job_assignments_one_technician_per_job
 ON public.job_assignments(job_id);
CREATE INDEX IF NOT EXISTS job_assignments_technician_job_idx
 ON public.job_assignments(technician_id,job_id);

-- Extend the allowed audit event types without changing existing history records.
ALTER TABLE public.job_history DROP CONSTRAINT IF EXISTS job_history_event_type_check;
ALTER TABLE public.job_history ADD CONSTRAINT job_history_event_type_check
 CHECK(event_type IN ('status_changed','job_edited','customer_edited','technician_assignment'));

-- Disallow client-side direct mutation that would skip service-history audit.
REVOKE INSERT,DELETE,UPDATE ON public.job_assignments FROM authenticated,anon;
GRANT SELECT ON public.job_assignments TO authenticated;

-- Inactive technicians must not read old assignments through Data API.
DROP POLICY IF EXISTS assignments_read ON public.job_assignments;
CREATE POLICY assignments_read ON public.job_assignments FOR SELECT TO authenticated
 USING ((select private.current_role()) IN ('admin','office')
  OR ((select private.current_role())='technician' AND technician_id=(select auth.uid())));

CREATE OR REPLACE FUNCTION public.assign_job_technician(p_job_id uuid,p_technician_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE
 v_actor uuid := (SELECT auth.uid());
 v_previous uuid;
 v_previous_name text;
 v_new_name text;
 v_exists uuid;
BEGIN
 IF v_actor IS NULL OR (SELECT private.current_role()) NOT IN ('admin','office')
 THEN RAISE EXCEPTION 'Only Admin and Shop Staff may assign technicians' USING ERRCODE='42501'; END IF;
 IF p_job_id IS NULL THEN RAISE EXCEPTION 'A valid job is required' USING ERRCODE='22023'; END IF;

 -- The row lock serializes all assign/unassign operations on the same job.
 SELECT id INTO v_exists FROM public.jobs WHERE id=p_job_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Job not found' USING ERRCODE='22023'; END IF;

 IF p_technician_id IS NOT NULL THEN
  SELECT p.full_name INTO v_new_name FROM public.profiles p
  WHERE p.id=p_technician_id AND p.role='technician' AND p.active=true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Choose an active Technician' USING ERRCODE='22023'; END IF;
 END IF;

 SELECT a.technician_id,p.full_name INTO v_previous,v_previous_name
 FROM public.job_assignments a
 LEFT JOIN public.profiles p ON p.id=a.technician_id
 WHERE a.job_id=p_job_id LIMIT 1;

 IF v_previous IS NOT DISTINCT FROM p_technician_id THEN RETURN; END IF;

 DELETE FROM public.job_assignments WHERE job_id=p_job_id;
 IF p_technician_id IS NOT NULL THEN
  INSERT INTO public.job_assignments(job_id,technician_id,assigned_by)
  VALUES(p_job_id,p_technician_id,v_actor);
 END IF;

 INSERT INTO public.job_history(job_id,actor_id,event_type,details)
 VALUES(
  p_job_id,v_actor,'technician_assignment',
  CASE WHEN p_technician_id IS NULL
   THEN 'Technician unassigned (previous: '||coalesce(v_previous_name,'Unknown')||')'
   WHEN v_previous IS NULL
   THEN 'Assigned technician: '||v_new_name
   ELSE 'Reassigned technician from '||coalesce(v_previous_name,'Unknown')||' to '||v_new_name
  END
 );
END $$;
REVOKE ALL ON FUNCTION public.assign_job_technician(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.assign_job_technician(uuid,uuid) TO authenticated;
NOTIFY pgrst,'reload schema';