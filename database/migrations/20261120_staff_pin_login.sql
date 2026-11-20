-- Dedicated CCTV Manager Pro only: secure numeric PIN login. Run after staff_accounts migration.
-- The real Supabase Auth password is server-side HMAC-SHA256(username + PIN)
-- with a random pepper encrypted in the project's Vault; never expose the pepper.
DO $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name='cctv_pin_hmac_pepper') THEN
  PERFORM vault.create_secret(encode(gen_random_bytes(32),'hex'),'cctv_pin_hmac_pepper');
 END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.staff_pin_attempts(
 username text PRIMARY KEY,
 attempts integer NOT NULL DEFAULT 0 CHECK(attempts >= 0),
 window_started_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.staff_pin_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.staff_pin_attempts FROM PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.cctv_staff_pin_pepper()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $$
 SELECT ds.decrypted_secret FROM vault.decrypted_secrets ds WHERE ds.name='cctv_pin_hmac_pepper' LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.cctv_staff_pin_pepper() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.cctv_staff_pin_pepper() TO service_role;

CREATE OR REPLACE FUNCTION public.cctv_staff_pin_attempt(p_username text)
RETURNS boolean LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $$
DECLARE
 v_username text:=lower(btrim(coalesce(p_username,'')));
 v_attempts integer;
BEGIN
 IF v_username !~ '^[a-z][a-z0-9._-]{2,31}$' THEN RETURN false; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.staff_accounts sa WHERE sa.username=v_username) THEN RETURN false; END IF;
 INSERT INTO public.staff_pin_attempts(username,attempts,window_started_at)
 VALUES(v_username,1,now())
 ON CONFLICT(username) DO UPDATE SET
 attempts=CASE WHEN public.staff_pin_attempts.window_started_at < now()-interval '30 minutes'
     THEN 1 ELSE public.staff_pin_attempts.attempts+1 END,
 window_started_at=CASE WHEN public.staff_pin_attempts.window_started_at < now()-interval '30 minutes'
     THEN now() ELSE public.staff_pin_attempts.window_started_at END
 RETURNING attempts INTO v_attempts;
 RETURN v_attempts<=5;
END
$$;
REVOKE ALL ON FUNCTION public.cctv_staff_pin_attempt(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.cctv_staff_pin_attempt(text) TO service_role;

CREATE OR REPLACE FUNCTION public.cctv_staff_pin_clear(p_username text)
RETURNS void LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path=''
AS $$
 DELETE FROM public.staff_pin_attempts WHERE username=lower(btrim(p_username));
$$;
REVOKE ALL ON FUNCTION public.cctv_staff_pin_clear(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.cctv_staff_pin_clear(text) TO service_role;
NOTIFY pgrst,'reload schema';
