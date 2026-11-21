-- Existing jobs, customers and assignments are kept intact.
CREATE TABLE public.technician_push_subscriptions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 technician_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 session_id uuid NOT NULL REFERENCES auth.sessions(id) ON DELETE CASCADE,
 endpoint text NOT NULL UNIQUE CHECK (length(endpoint) <= 2048),
 p256dh text NOT NULL CHECK (p256dh ~ '^[A-Za-z0-9_-]{87}$'),
 auth_secret text NOT NULL CHECK (auth_secret ~ '^[A-Za-z0-9_-]{22}$')
);
CREATE INDEX technician_push_subscriptions_owner ON public.technician_push_subscriptions(technician_id);
CREATE INDEX technician_push_subscriptions_session ON public.technician_push_subscriptions(session_id);

CREATE TABLE public.assignment_push_deliveries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 job_id uuid NOT NULL REFERENCES public.job_assignments(job_id) ON DELETE CASCADE,
 subscription_id uuid NOT NULL REFERENCES public.technician_push_subscriptions(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now(),
 available_at timestamptz NOT NULL DEFAULT now(),
 attempts integer NOT NULL DEFAULT 0,
 UNIQUE (job_id, subscription_id)
);
CREATE INDEX assignment_push_available ON public.assignment_push_deliveries(available_at);
CREATE INDEX assignment_push_subscription ON public.assignment_push_deliveries(subscription_id);

ALTER TABLE public.technician_push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_push_deliveries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.technician_push_subscriptions, public.assignment_push_deliveries FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.manage_technician_push(p_action text, p_endpoint text, p_p256dh text DEFAULT NULL, p_auth text DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
 v_user uuid := auth.uid();
 v_session uuid := (auth.jwt()->>'session_id')::uuid;
BEGIN
 IF v_user IS NULL OR v_session IS NULL THEN
  RAISE EXCEPTION 'A signed-in session is required' USING ERRCODE='42501';
 END IF;

 IF p_action = 'remove' THEN
  DELETE FROM public.technician_push_subscriptions
  WHERE technician_id=v_user AND session_id=v_session AND (p_endpoint IS NULL OR endpoint=p_endpoint);
  RETURN true;
 END IF;

 IF (SELECT private.current_role()) IS DISTINCT FROM 'technician'
 OR NOT EXISTS (SELECT FROM auth.sessions WHERE id=v_session AND user_id=v_user) THEN
  RAISE EXCEPTION 'An active Technician session is required' USING ERRCODE='42501';
 END IF;

 IF p_action = 'status' THEN
  RETURN EXISTS (SELECT FROM public.technician_push_subscriptions
   WHERE technician_id=v_user AND session_id=v_session AND endpoint=p_endpoint);
 END IF;

 IF p_action IS DISTINCT FROM 'register' OR p_endpoint IS NULL OR length(p_endpoint)>2048
 OR p_endpoint !~ '^https://(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|web\.push\.apple\.com|[a-z0-9-]+\.notify\.windows\.com)/[^[:space:]#]+$'
 OR p_p256dh IS NULL OR p_p256dh !~ '^[A-Za-z0-9_-]{87}$'
 OR p_auth IS NULL OR p_auth !~ '^[A-Za-z0-9_-]{22}$' THEN
  RAISE EXCEPTION 'Invalid push subscription' USING ERRCODE='22023';
 END IF;

 PERFORM pg_advisory_xact_lock(hashtextextended(v_user::text, 4381));
 IF EXISTS (SELECT FROM public.technician_push_subscriptions
  WHERE technician_id=v_user AND session_id=v_session AND endpoint=p_endpoint
    AND p256dh=p_p256dh AND auth_secret=p_auth) THEN
  RETURN true;
 END IF;
 IF (SELECT count(*) FROM public.technician_push_subscriptions WHERE technician_id=v_user) >= 10 THEN
  RAISE EXCEPTION 'Technician device limit reached' USING ERRCODE='22023';
 END IF;
 INSERT INTO public.technician_push_subscriptions(technician_id,session_id,endpoint,p256dh,auth_secret)
 VALUES (v_user,v_session,p_endpoint,p_p256dh,p_auth);
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.manage_technician_push(text,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.manage_technician_push(text,text,text,text) TO authenticated;

CREATE FUNCTION private.queue_assignment_push()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 INSERT INTO public.assignment_push_deliveries(job_id,subscription_id)
 SELECT NEW.job_id,s.id FROM public.technician_push_subscriptions s
 WHERE s.technician_id=NEW.technician_id;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.queue_assignment_push() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER queue_assignment_push AFTER INSERT ON public.job_assignments
 FOR EACH ROW EXECUTE FUNCTION private.queue_assignment_push();

CREATE FUNCTION public.claim_assignment_push()
RETURNS TABLE(id uuid, attempt integer) LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 DELETE FROM public.assignment_push_deliveries d
 WHERE d.created_at < now()-interval '48 hours' OR (d.attempts>=6 AND d.available_at<=now());

 RETURN QUERY WITH due AS (
  SELECT d.id FROM public.assignment_push_deliveries d
  WHERE d.available_at<=now() AND d.attempts<6
  ORDER BY d.available_at,d.id LIMIT 12 FOR UPDATE SKIP LOCKED
 )
 UPDATE public.assignment_push_deliveries d
 SET attempts=d.attempts+1,available_at=now()+interval '2 minutes'
 FROM due WHERE d.id=due.id RETURNING d.id,d.attempts;
END $$;

CREATE VIEW public.eligible_assignment_push WITH (security_invoker=true) AS
 SELECT d.id,d.attempts,d.job_id,s.id AS subscription_id,s.endpoint,s.p256dh,s.auth_secret
 FROM public.assignment_push_deliveries d
 JOIN public.job_assignments a ON a.job_id=d.job_id
 JOIN public.technician_push_subscriptions s ON s.id=d.subscription_id AND s.technician_id=a.technician_id
 JOIN public.profiles p ON p.id=s.technician_id AND p.active AND p.role='technician'
 WHERE d.created_at>=now()-interval '48 hours';
REVOKE ALL ON public.eligible_assignment_push FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_assignment_push() FROM PUBLIC, anon, authenticated;
-- A dedicated worker credential grants access only to the delivery queue.
CREATE TABLE private.assignment_push_worker_key (
 singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
 secret_hash bytea NOT NULL
);
REVOKE ALL ON private.assignment_push_worker_key FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.process_assignment_push(
 p_token text, p_action text, p_id uuid DEFAULT NULL, p_attempt integer DEFAULT NULL,
 p_retry_seconds integer DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
 v_result jsonb;
BEGIN
 IF p_token IS NULL OR length(p_token)<>64 OR NOT EXISTS (
  SELECT FROM private.assignment_push_worker_key
  WHERE secret_hash=sha256(convert_to(p_token,'UTF8'))
 ) THEN
  RAISE EXCEPTION 'Worker authorization required' USING ERRCODE='42501';
 END IF;

 IF p_action='claim' THEN
  SELECT coalesce(jsonb_agg(to_jsonb(claim)), '[]'::jsonb)
   INTO v_result FROM public.claim_assignment_push() claim;
 ELSIF p_action='lookup' THEN
  SELECT to_jsonb(e) INTO v_result FROM public.eligible_assignment_push e
  WHERE e.id=p_id AND e.attempts=p_attempt;
 ELSIF p_action='expire' THEN
  DELETE FROM public.technician_push_subscriptions s
  USING public.assignment_push_deliveries d
  WHERE d.id=p_id AND d.attempts=p_attempt AND s.id=d.subscription_id;
 ELSIF p_action='retry' AND p_retry_seconds BETWEEN 60 AND 3600 AND p_attempt BETWEEN 1 AND 5 THEN
  UPDATE public.assignment_push_deliveries
  SET available_at=now()+make_interval(secs=>p_retry_seconds)
  WHERE id=p_id AND attempts=p_attempt;
 ELSIF p_action='finish' THEN
  DELETE FROM public.assignment_push_deliveries WHERE id=p_id AND attempts=p_attempt;
 ELSE
  RAISE EXCEPTION 'Invalid worker action' USING ERRCODE='22023';
 END IF;
 RETURN v_result;
END $$;
REVOKE ALL ON FUNCTION public.process_assignment_push(text,text,uuid,integer,integer) FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION public.process_assignment_push(text,text,uuid,integer,integer) TO anon;

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
 IF v_actor IS NULL OR NOT coalesce((SELECT private.current_role()) IN ('admin','office'), false)
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

