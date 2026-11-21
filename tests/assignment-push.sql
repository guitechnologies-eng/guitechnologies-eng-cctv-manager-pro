-- Run within a transaction and roll back. All rows below are disposable fixtures.
DO $test$
DECLARE
 admin_id uuid := gen_random_uuid();
 office_id uuid := gen_random_uuid();
 tech_id uuid := gen_random_uuid();
 other_id uuid := gen_random_uuid();
 inactive_id uuid := gen_random_uuid();
 tech_session uuid := gen_random_uuid();
 other_session uuid := gen_random_uuid();
 customer_id uuid;
 fixture_job uuid;
 event_id uuid;
 worker_token text := repeat('a',64);
 claims jsonb;
 tech_endpoint text := 'https://fcm.googleapis.com/fcm/send/'||tech_id;
 other_endpoint text := 'https://fcm.googleapis.com/fcm/send/'||other_id;
BEGIN
 INSERT INTO auth.users(id) VALUES (admin_id),(office_id),(tech_id),(other_id),(inactive_id);
 INSERT INTO public.profiles(id,full_name,role,active)
 VALUES (admin_id,'Test Admin','admin',true), (office_id,'Test Shop Staff','office',true),
        (tech_id,'Test Technician','technician',true), (other_id,'Other Technician','technician',true),
        (inactive_id,'Inactive Admin','admin',false);
 INSERT INTO auth.sessions(id,user_id) VALUES (tech_session,tech_id),(other_session,other_id);
 INSERT INTO public.customers(name) VALUES ('Push test customer') RETURNING id INTO customer_id;
 INSERT INTO public.jobs(job_number,customer_id,title,kind,created_by)
 VALUES ('push-test-'||gen_random_uuid(),customer_id,'Push test job','breakdown',admin_id)
 RETURNING id INTO fixture_job;

 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub', tech_id,'session_id',tech_session)::text,true);
 PERFORM public.manage_technician_push('register',tech_endpoint,repeat('B',87),repeat('C',22));
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub', other_id,'session_id',other_session)::text,true);
 PERFORM public.manage_technician_push('register',other_endpoint,repeat('B',87),repeat('C',22));
 IF public.manage_technician_push('status',tech_endpoint) THEN
  RAISE EXCEPTION 'Unrelated technician can see subscription';
 END IF;
 PERFORM public.manage_technician_push('remove',tech_endpoint);
 BEGIN
  PERFORM public.assign_job_technician(fixture_job,tech_id);
  RAISE EXCEPTION 'Technician could assign job';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;

 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub', inactive_id)::text,true);
 BEGIN
  PERFORM public.assign_job_technician(fixture_job,tech_id);
  RAISE EXCEPTION 'Inactive admin could assign job';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;

 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub', office_id)::text,true);
 PERFORM public.assign_job_technician(fixture_job,tech_id);
 PERFORM public.assign_job_technician(fixture_job,tech_id);
 IF (SELECT count(*) FROM public.eligible_assignment_push WHERE job_id=fixture_job) <> 1
 OR NOT EXISTS (SELECT FROM public.eligible_assignment_push WHERE job_id=fixture_job AND endpoint=tech_endpoint) THEN
  RAISE EXCEPTION 'Assignment did not enqueue exactly the chosen technician';
 END IF;
 SELECT id INTO event_id FROM public.eligible_assignment_push WHERE job_id=fixture_job;

 BEGIN
  PERFORM public.process_assignment_push(repeat('b',64),'claim');
  RAISE EXCEPTION 'Bad worker credentials could claim deliveries';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 INSERT INTO private.assignment_push_worker_key(secret_hash)
 VALUES (sha256(convert_to(worker_token,'UTF8')))
 ON CONFLICT (singleton) DO UPDATE SET secret_hash=excluded.secret_hash;
 claims := public.process_assignment_push(worker_token,'claim');
 IF NOT claims @> jsonb_build_array(jsonb_build_object('id',event_id,'attempt',1)) THEN
  RAISE EXCEPTION 'Worker could not claim queued delivery';
 END IF;
 IF public.process_assignment_push(worker_token,'claim') @> jsonb_build_array(jsonb_build_object('id',event_id)) THEN
  RAISE EXCEPTION 'Worker double-claimed a leased delivery';
 END IF;
 PERFORM public.process_assignment_push(worker_token,'retry',event_id,1,240);
 IF NOT EXISTS (SELECT FROM public.assignment_push_deliveries
   WHERE id=event_id AND attempts=1 AND available_at>=now()+interval '4 minutes') THEN
  RAISE EXCEPTION 'Worker did not reschedule delivery';
 END IF;

 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub', admin_id)::text,true);
 PERFORM public.assign_job_technician(fixture_job,other_id);
 IF public.process_assignment_push(worker_token,'lookup',event_id,1) IS NOT NULL
 OR NOT EXISTS (SELECT FROM public.eligible_assignment_push WHERE job_id=fixture_job AND endpoint=other_endpoint) THEN
  RAISE EXCEPTION 'Reassignment did not cancel the original delivery';
 END IF;
 UPDATE public.profiles SET active=false WHERE id=other_id;
 IF EXISTS (SELECT FROM public.eligible_assignment_push WHERE job_id=fixture_job) THEN
  RAISE EXCEPTION 'Inactive technician is eligible';
 END IF;
 DELETE FROM auth.sessions WHERE id=other_session;
 IF EXISTS (SELECT FROM public.assignment_push_deliveries WHERE job_id=fixture_job) THEN
  RAISE EXCEPTION 'Session revocation did not clear queued pushes';
 END IF;
 PERFORM public.assign_job_technician(fixture_job,NULL);

 IF has_table_privilege('anon','public.technician_push_subscriptions','SELECT')
 OR has_table_privilege('authenticated','public.technician_push_subscriptions','SELECT')
 OR has_table_privilege('authenticated','public.assignment_push_deliveries','INSERT')
 OR has_function_privilege('authenticated','public.claim_assignment_push()','EXECUTE') THEN
  RAISE EXCEPTION 'Direct queue privileges are exposed';
 END IF;
END
$test$;
