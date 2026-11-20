-- CCTV Manager Pro only. Security-invoker read of the latest note per job.
-- Exposes one note per job, instead of fetching 1000 historical note rows per dashboard load.
CREATE OR REPLACE VIEW public.latest_job_updates WITH (security_invoker=true) AS
 SELECT DISTINCT ON (u.job_id)
  u.job_id,u.note,u.created_at
 FROM public.job_updates u
 ORDER BY u.job_id,u.created_at DESC,u.id DESC;
REVOKE ALL ON public.latest_job_updates FROM PUBLIC,anon;
GRANT SELECT ON public.latest_job_updates TO authenticated;
CREATE INDEX IF NOT EXISTS job_updates_latest_lookup_idx ON public.job_updates(job_id,created_at DESC,id DESC);
NOTIFY pgrst,'reload schema';
