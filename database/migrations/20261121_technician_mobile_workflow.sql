-- CCTV Manager Pro, dedicated Supabase project only.
-- Additive Technician Mobile workflow: assigned job start/complete without admin approval.
-- Preserves all existing jobs, customers, assignments and history.
CREATE OR REPLACE FUNCTION public.technician_set_job_progress(
 p_job_id uuid,
 p_action text,
 p_note text DEFAULT NULL
) RETURNS public.job_status
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE
 v_actor uuid:=(SELECT auth.uid());
 v_old public.job_status;
 v_new public.job_status;
 v_note text:=btrim(coalesce(p_note,''));
BEGIN
 IF v_actor IS NULL OR (SELECT private.current_role()) IS DISTINCT FROM 'technician'::public.staff_role
 THEN RAISE EXCEPTION 'Only active technicians may update their assigned jobs'
  USING ERRCODE='42501'; END IF;
 IF p_job_id IS NULL OR p_action NOT IN ('start','complete') OR p_action IS NULL
 THEN RAISE EXCEPTION 'Invalid job or action' USING ERRCODE='22023'; END IF;
 IF length(v_note)>1200
 THEN RAISE EXCEPTION 'Progress note too long' USING ERRCODE='22023'; END IF;

 -- Same job-row lock order as assign_job_technician, prevents races with reassignment.
 SELECT j.status INTO v_old
 FROM public.jobs j WHERE j.id=p_job_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Job not found' USING ERRCODE='22023'; END IF;
 IF NOT EXISTS (
  SELECT 1 FROM public.job_assignments a WHERE a.job_id=p_job_id AND a.technician_id=v_actor
 ) THEN RAISE EXCEPTION 'This job is not assigned to you' USING ERRCODE='42501'; END IF;

 IF v_old IN ('completed','cancelled') THEN
  IF v_old='completed' AND p_action='complete' THEN RETURN v_old; END IF;
  RAISE EXCEPTION 'This service job is already closed' USING ERRCODE='22023';
 END IF;
 v_new:=CASE WHEN p_action='start' THEN 'in_progress'::public.job_status
  ELSE 'completed'::public.job_status END;
 IF v_old IS DISTINCT FROM v_new THEN
  -- Existing audit trigger logs status change and actor. Completion is immediate.
  UPDATE public.jobs SET status=v_new WHERE id=p_job_id;
 END IF;
 IF length(v_note)>0 THEN
  INSERT INTO public.job_updates(job_id,author_id,status,note)
  VALUES(p_job_id,v_actor,v_new,v_note);
 END IF;
 RETURN v_new;
END $$;
REVOKE ALL ON FUNCTION public.technician_set_job_progress(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.technician_set_job_progress(uuid,text,text) TO authenticated;

-- Technician lodging / overnight accommodation expenses and notes.
CREATE TABLE IF NOT EXISTS public.technician_lodging (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 technician_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
 job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL,
 stay_date date NOT NULL,
 location text NOT NULL CHECK (length(btrim(location)) BETWEEN 3 AND 160),
 nights smallint NOT NULL DEFAULT 1 CHECK(nights BETWEEN 1 AND 30),
 expense_lkr numeric(12,2) CHECK(expense_lkr IS NULL OR (expense_lkr>=0 AND expense_lkr<=9999999)),
 notes text CHECK(notes IS NULL OR length(notes)<=800),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS technician_lodging_owner_date_idx
 ON public.technician_lodging(technician_id,stay_date DESC);
ALTER TABLE public.technician_lodging ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.technician_lodging FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT ON public.technician_lodging TO authenticated;
DROP POLICY IF EXISTS technician_lodging_read ON public.technician_lodging;
CREATE POLICY technician_lodging_read ON public.technician_lodging
 FOR SELECT TO authenticated
 USING (
  (technician_id=(SELECT auth.uid()) AND (SELECT private.current_role())='technician'::public.staff_role)
  OR ((SELECT private.current_role()) IN ('admin','office'))
 );
DROP POLICY IF EXISTS technician_lodging_insert ON public.technician_lodging;
CREATE POLICY technician_lodging_insert ON public.technician_lodging
 FOR INSERT TO authenticated
 WITH CHECK (
  technician_id=(SELECT auth.uid())
  AND (SELECT private.current_role())='technician'::public.staff_role
  AND (job_id IS NULL OR EXISTS(
   SELECT 1 FROM public.job_assignments a
   WHERE a.job_id=job_id AND a.technician_id=(SELECT auth.uid())
  ))
 );
NOTIFY pgrst,'reload schema';
