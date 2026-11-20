-- CCTV Manager Pro only. Admin-managed user editing. No existing data changed at migration time.
-- The Edge function calls this RPC with the service role after checking its Admin JWT.
-- A single transaction + advisory lock prevents accidentally disabling all administrators.
CREATE OR REPLACE FUNCTION public.cctv_admin_edit_staff(
 p_actor uuid,p_target uuid,p_full_name text,p_role public.staff_role,p_active boolean
) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path=''
AS $$
DECLARE
 v_actor_role public.staff_role; v_actor_active boolean;
 v_old_role public.staff_role; v_old_active boolean; v_remaining integer;
BEGIN
 PERFORM pg_catalog.pg_advisory_xact_lock(987654321,10203040);
 SELECT role,active INTO v_actor_role,v_actor_active FROM public.profiles WHERE id=p_actor FOR UPDATE;
 IF v_actor_role IS DISTINCT FROM 'admin'::public.staff_role OR v_actor_active IS DISTINCT FROM true
 THEN RAISE EXCEPTION 'Admin required' USING ERRCODE='42501';END IF;
 SELECT role,active INTO v_old_role,v_old_active FROM public.profiles WHERE id=p_target FOR UPDATE;
 IF v_old_role IS NULL OR NOT EXISTS(SELECT 1 FROM public.staff_accounts WHERE user_id=p_target)
 THEN RAISE EXCEPTION 'Staff user not found' USING ERRCODE='22023';END IF;
 IF p_full_name IS NULL OR length(btrim(p_full_name)) NOT BETWEEN 2 AND 120 OR
    p_role NOT IN ('admin','office','technician') OR p_active IS NULL
 THEN RAISE EXCEPTION 'Invalid staff details' USING ERRCODE='22023';END IF;
 IF p_target=p_actor AND (p_role<>v_old_role OR NOT p_active)
 THEN RAISE EXCEPTION 'You cannot change your own admin access' USING ERRCODE='42501';END IF;
 IF v_old_role='admin' AND v_old_active AND (p_role<>'admin' OR NOT p_active) THEN
  SELECT count(*) INTO v_remaining FROM public.profiles WHERE role='admin' AND active AND id<>p_target;
  IF v_remaining=0 THEN RAISE EXCEPTION 'Cannot remove the last active administrator' USING ERRCODE='42501';END IF;
 END IF;
 UPDATE public.profiles SET full_name=btrim(p_full_name),role=p_role,active=p_active WHERE id=p_target;
END $$;
REVOKE ALL ON FUNCTION public.cctv_admin_edit_staff(uuid,uuid,text,public.staff_role,boolean)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.cctv_admin_edit_staff(uuid,uuid,text,public.staff_role,boolean)
 TO service_role;
NOTIFY pgrst,'reload schema';
