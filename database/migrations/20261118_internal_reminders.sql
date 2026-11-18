-- CCTV Manager Pro only. Additive internal reminder fields and service-history auditing.
-- Run after the base schema and V2 service history migration; do not run on other databases.
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS follow_up_at timestamptz;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS reminder_note text;
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_reminder_note_length;
ALTER TABLE public.jobs ADD CONSTRAINT jobs_reminder_note_length CHECK (reminder_note IS NULL OR char_length(reminder_note) <= 500);
CREATE INDEX IF NOT EXISTS jobs_follow_up_at_idx ON public.jobs(follow_up_at) WHERE follow_up_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS jobs_scheduled_at_idx ON public.jobs(scheduled_at) WHERE scheduled_at IS NOT NULL;

CREATE OR REPLACE FUNCTION private.audit_cctv_reminder_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_details text;
BEGIN
 IF v_actor IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.profiles p
     WHERE p.id=v_actor AND p.active AND p.role IN ('admin','office')
 ) THEN
    RAISE EXCEPTION 'Unauthorized reminder edit' USING ERRCODE='42501';
 END IF;
 v_details := concat_ws(' | ',
  CASE WHEN OLD.scheduled_at IS DISTINCT FROM NEW.scheduled_at
       THEN 'Visit date: '||coalesce(OLD.scheduled_at::text,'(unset)')||' → '||coalesce(NEW.scheduled_at::text,'(unset)') END,
  CASE WHEN OLD.follow_up_at IS DISTINCT FROM NEW.follow_up_at
       THEN 'Follow-up date: '||coalesce(OLD.follow_up_at::text,'(unset)')||' → '||coalesce(NEW.follow_up_at::text,'(unset)') END,
  CASE WHEN OLD.reminder_note IS DISTINCT FROM NEW.reminder_note
       THEN 'Reminder note: '||coalesce(OLD.reminder_note,'(unset)')||' → '||coalesce(NEW.reminder_note,'(unset)') END
 );
 IF v_details <> '' THEN
   INSERT INTO public.job_history(job_id,actor_id,event_type,details)
   VALUES (NEW.id,v_actor,'job_edited',v_details);
 END IF;
 RETURN NEW;
END
$function$;
REVOKE ALL ON FUNCTION private.audit_cctv_reminder_change() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS audit_cctv_reminder_update ON public.jobs;
CREATE TRIGGER audit_cctv_reminder_update
 AFTER UPDATE OF scheduled_at,follow_up_at,reminder_note ON public.jobs
 FOR EACH ROW EXECUTE FUNCTION private.audit_cctv_reminder_change();
NOTIFY pgrst,'reload schema';
