-- CCTV Manager Pro V2 only. Safe additive migration; no existing customer/job rows removed.
-- Do not run on My Solution Colombo or Attendance/Salary databases.
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS site_address text;

CREATE TABLE IF NOT EXISTS public.job_history (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
 actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
 event_type text NOT NULL CHECK(event_type IN ('status_changed','job_edited','customer_edited')),
 details text NOT NULL CHECK(length(trim(details))>0),
 previous_status public.job_status,
 new_status public.job_status,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS job_history_job_created_idx ON public.job_history(job_id,created_at DESC);
ALTER TABLE public.job_history ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.job_history FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.job_history TO authenticated;
DROP POLICY IF EXISTS job_history_read ON public.job_history;
CREATE POLICY job_history_read ON public.job_history FOR SELECT TO authenticated
 USING ((select private.current_role()) IN ('admin','office') OR (select private.is_assigned(job_id)));

CREATE OR REPLACE FUNCTION private.audit_cctv_job_changes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE v_actor uuid:=auth.uid(); v_details text;
BEGIN
 IF v_actor IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id=v_actor AND p.active AND p.role IN ('admin','office')
 ) THEN RAISE EXCEPTION 'Unauthorized job edit'; END IF;

 IF OLD.status IS DISTINCT FROM NEW.status THEN
  INSERT INTO public.job_history(job_id,actor_id,event_type,details,previous_status,new_status)
  VALUES (NEW.id,v_actor,'status_changed','Status: '||OLD.status::text||' → '||NEW.status::text,OLD.status,NEW.status);
 END IF;
 v_details:=concat_ws(' | ',
  CASE WHEN OLD.title IS DISTINCT FROM NEW.title THEN 'Reason: '||OLD.title||' → '||NEW.title END,
  CASE WHEN OLD.kind IS DISTINCT FROM NEW.kind THEN 'Type: '||OLD.kind::text||' → '||NEW.kind::text END,
  CASE WHEN OLD.priority IS DISTINCT FROM NEW.priority THEN 'Priority: '||OLD.priority||' → '||NEW.priority END,
  CASE WHEN OLD.request_section IS DISTINCT FROM NEW.request_section THEN 'Section: '||coalesce(OLD.request_section,'(none)')||' → '||coalesce(NEW.request_section,'(none)') END,
  CASE WHEN OLD.description IS DISTINCT FROM NEW.description THEN 'Description: '||coalesce(OLD.description,'(none)')||' → '||coalesce(NEW.description,'(none)') END,
  CASE WHEN OLD.site_address IS DISTINCT FROM NEW.site_address THEN 'Place override: '||coalesce(OLD.site_address,'(customer address)')||' → '||coalesce(NEW.site_address,'(customer address)') END
 );
 IF v_details<>'' THEN
  INSERT INTO public.job_history(job_id,actor_id,event_type,details)
  VALUES (NEW.id,v_actor,'job_edited',v_details);
 END IF;
 RETURN NEW;
END
$$;
REVOKE ALL ON FUNCTION private.audit_cctv_job_changes() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS audit_cctv_job_update ON public.jobs;
CREATE TRIGGER audit_cctv_job_update
 AFTER UPDATE OF status,title,kind,priority,request_section,description,site_address ON public.jobs
 FOR EACH ROW EXECUTE FUNCTION private.audit_cctv_job_changes();

CREATE OR REPLACE FUNCTION private.audit_cctv_customer_changes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE v_actor uuid:=auth.uid(); v_details text;
BEGIN
 IF v_actor IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id=v_actor AND p.active AND p.role IN ('admin','office')
 ) THEN RAISE EXCEPTION 'Unauthorized customer edit'; END IF;
 v_details:=concat_ws(' | ',
  CASE WHEN OLD.name IS DISTINCT FROM NEW.name THEN 'Customer: '||OLD.name||' → '||NEW.name END,
  CASE WHEN OLD.phone IS DISTINCT FROM NEW.phone THEN 'Phone: '||coalesce(OLD.phone,'(none)')||' → '||coalesce(NEW.phone,'(none)') END,
  CASE WHEN OLD.address IS DISTINCT FROM NEW.address THEN 'Customer address: '||coalesce(OLD.address,'(none)')||' → '||coalesce(NEW.address,'(none)') END
 );
 IF v_details<>'' THEN
  INSERT INTO public.job_history(job_id,actor_id,event_type,details)
  SELECT j.id,v_actor,'customer_edited',v_details FROM public.jobs j WHERE j.customer_id=NEW.id;
 END IF;
 RETURN NEW;
END
$$;
REVOKE ALL ON FUNCTION private.audit_cctv_customer_changes() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS audit_cctv_customer_update ON public.customers;
CREATE TRIGGER audit_cctv_customer_update
 AFTER UPDATE OF name,phone,address ON public.customers
 FOR EACH ROW EXECUTE FUNCTION private.audit_cctv_customer_changes();

CREATE OR REPLACE VIEW public.service_history WITH (security_invoker=true) AS
 SELECT h.id,h.job_id,h.actor_id,h.event_type,h.details,h.previous_status,h.new_status,h.created_at
 FROM public.job_history h
 UNION ALL
 SELECT u.id,u.job_id,u.author_id,'progress_note'::text,u.note,
        NULL::public.job_status,u.status,u.created_at
 FROM public.job_updates u;
REVOKE ALL ON public.service_history FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.service_history TO authenticated;
NOTIFY pgrst,'reload schema';
