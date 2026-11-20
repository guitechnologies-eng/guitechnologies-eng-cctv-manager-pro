-- CCTV Manager Pro: admin-managed staff username directory.
-- Apply ONLY to the dedicated Guit2004 CCTV database. No customer/job rows changed.
CREATE TABLE IF NOT EXISTS public.staff_accounts (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 username text NOT NULL UNIQUE
  CONSTRAINT staff_accounts_username_valid
  CHECK (username ~ '^[a-z][a-z0-9._-]{2,31}$' AND username=lower(username)),
 created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.staff_accounts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.staff_accounts FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.staff_accounts TO authenticated;
DROP POLICY IF EXISTS staff_accounts_admin_read ON public.staff_accounts;
CREATE POLICY staff_accounts_admin_read ON public.staff_accounts FOR SELECT TO authenticated
 USING ((SELECT private.current_role())='admin'::public.staff_role);
-- Register existing username alias without altering the original Admin auth user.
INSERT INTO public.staff_accounts(user_id,username)
 SELECT id,'guiadmin' FROM auth.users WHERE lower(email)='guitechnologies@gmail.com'
 ON CONFLICT (user_id) DO NOTHING;
NOTIFY pgrst,'reload schema';
