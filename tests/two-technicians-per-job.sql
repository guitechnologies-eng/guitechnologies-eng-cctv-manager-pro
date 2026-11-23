-- SECURITY / BEHAVIOR QA: run only in dedicated CCTV database AFTER migration.
-- Entire fixture is rolled back; do not use actual customers or jobs.
BEGIN;
DO $check$
DECLARE
 v_admin uuid:=gen_random_uuid();
 v_inactive uuid:=gen_random_uuid();
 v_tech1 uuid:=gen_random_uuid();
 v_tech2 uuid:=gen_random_uuid();
 v_tech3 uuid:=gen_random_uuid();
 v_customer uuid;
 v_job uuid;
 v_history integer;
BEGIN
 INSERT INTO auth.users(id) VALUES(v_admin),(v_inactive),(v_tech1),(v_tech2),(v_tech3);
 INSERT INTO public.profiles(id,full_name,role,active) VALUES
  (v_admin,'Dual assignment QA Admin','admin',true),
  (v_inactive,'Dual assignment QA Inactive','office',false),
  (v_tech1,'Dual assignment QA Tech 1','technician',true),
  (v_tech2,'Dual assignment QA Tech 2','technician',true),
  (v_tech3,'Dual assignment QA Tech 3','technician',true);
 INSERT INTO public.customers(name) VALUES('Dual assignment QA Customer')
 RETURNING id INTO v_customer;
 INSERT INTO public.jobs(job_number,customer_id,title,kind,created_by)
 VALUES('qa-two-tech-'||gen_random_uuid(),v_customer,'QA service job','breakdown',v_admin)
 RETURNING id INTO v_job;

 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',v_admin)::text,true);
 PERFORM public.assign_job_technicians(v_job,ARRAY[v_tech1,v_tech2]);
 IF (SELECT count(*) FROM public.job_assignments WHERE job_id=v_job)<>2 THEN
  RAISE EXCEPTION 'Two technicians not saved'; END IF;
 SELECT count(*) INTO v_history FROM public.job_history
 WHERE job_id=v_job AND event_type='technician_assignment';
 PERFORM public.assign_job_technicians(v_job,ARRAY[v_tech2,v_tech1]);
 IF (SELECT count(*) FROM public.job_history
     WHERE job_id=v_job AND event_type='technician_assignment')<>v_history THEN
  RAISE EXCEPTION 'Idempotent save incorrectly added history'; END IF;

 BEGIN
  PERFORM public.assign_job_technicians(v_job,ARRAY[v_tech1,v_tech1]);
  RAISE EXCEPTION 'Duplicate assignee unexpectedly allowed';
 EXCEPTION WHEN invalid_parameter_value THEN NULL;
 END;
 BEGIN
  PERFORM public.assign_job_technicians(v_job,ARRAY[v_tech1,v_tech2,v_tech3]);
  RAISE EXCEPTION 'Three assignees unexpectedly allowed';
 EXCEPTION WHEN invalid_parameter_value THEN NULL;
 END;
 BEGIN
  PERFORM public.assign_job_technician(v_job,v_tech3);
  RAISE EXCEPTION 'Legacy one-tech RPC removed two-person team';
 EXCEPTION WHEN invalid_parameter_value THEN NULL;
 END;

 -- Replace only technician 2 and preserve technician 1 membership.
 PERFORM public.assign_job_technicians(v_job,ARRAY[v_tech1,v_tech3]);
 IF (SELECT count(*) FROM public.job_assignments WHERE job_id=v_job)<>2
 OR NOT EXISTS (SELECT 1 FROM public.job_assignments WHERE job_id=v_job AND technician_id=v_tech1)
 OR NOT EXISTS (SELECT 1 FROM public.job_assignments WHERE job_id=v_job AND technician_id=v_tech3)
 THEN RAISE EXCEPTION 'Replacing one technician unexpectedly removed the other'; END IF;

 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',v_inactive)::text,true);
 BEGIN
  PERFORM public.assign_job_technicians(v_job,ARRAY[v_tech2]);
  RAISE EXCEPTION 'Inactive office role assigned technicians';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;

 -- Either of the two assigned technicians may complete the shared job.
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',v_tech3)::text,true);
 PERFORM public.technician_set_job_progress(v_job,'complete','Completed by assigned tech 3');
 IF (SELECT status FROM public.jobs WHERE id=v_job)<>'completed' THEN
  RAISE EXCEPTION 'Shared job did not complete immediately'; END IF;

 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',v_admin)::text,true);
 PERFORM public.assign_job_technicians(v_job,ARRAY[]::uuid[]);
 IF EXISTS(SELECT 1 FROM public.job_assignments WHERE job_id=v_job) THEN
  RAISE EXCEPTION 'Unassign did not clear job membership'; END IF;
END
$check$;
ROLLBACK;
