-- CCTV Manager Pro: atomic job + customer creation. Apply after base schema.
-- All writes are SECURITY INVOKER and subject to existing RLS. Never run on other databases.
CREATE OR REPLACE FUNCTION public.create_job_with_customer(p_customer_id uuid, p_customer_name text, p_customer_phone text, p_customer_address text, p_title text, p_kind text, p_priority text, p_request_section text, p_description text DEFAULT NULL::text, p_site_address text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
 v_actor uuid := auth.uid();
 v_customer uuid;
 v_name text := btrim(coalesce(p_customer_name,''));
 v_phone text := nullif(btrim(coalesce(p_customer_phone,'')),'');
 v_address text := nullif(btrim(coalesce(p_customer_address,'')),'');
 v_digits text := regexp_replace(coalesce(p_customer_phone,''),'[^0-9]','','g');
 v_phone_key text;
 v_match_count integer := 0;
 v_matched_id uuid;
 v_matched_name text;
 v_job_number text;
 v_created boolean := false;
begin
 if v_actor is null or (select private.current_role()) not in ('admin','office') then
  raise exception 'Not authorized to create jobs' using errcode='42501';
 end if;
 if p_title is null or length(btrim(p_title)) not between 1 and 180
   or p_kind is null or p_kind not in ('breakdown','site_visit','installation')
   or p_priority is null or p_priority not in ('low','normal','high','urgent')
   or p_request_section is null or p_request_section not in ('CCTV NEW INSTALLATION REQUEST','REPAIR & WARRANTY SERVICE','OTHER')
   or length(coalesce(p_description,'')) > 2000 or length(coalesce(p_site_address,'')) > 500 then
  raise exception 'Invalid job details' using errcode='22023';
 end if;
 if p_customer_id is not null then
  select c.id into v_customer from public.customers c where c.id=p_customer_id;
  if v_customer is null then
   raise exception 'Selected customer not found. Select an existing customer or enter new details.' using errcode='22023';
  end if;
 else
  if length(v_name) not between 1 and 120
    or length(coalesce(v_phone,'')) > 40
    or length(coalesce(v_address,'')) > 500 then
   raise exception 'Valid customer name is required (max 120 characters).' using errcode='22023';
  end if;

  -- Normalize Sri Lankan phone variants 7xxxxxxxx / 07xxxxxxxx / 947xxxxxxxx.
  v_phone_key := case
   when v_digits ~ '^(94)?7[0-9]{8}$' or v_digits ~ '^07[0-9]{8}$'
    then right(v_digits,9)
   else nullif(v_digits,'')
  end;

  -- Serialize concurrent submissions of the same identity to avoid accidental duplicates.
  perform pg_catalog.pg_advisory_xact_lock(
   pg_catalog.hashtextextended('cctv_customer:'||
      case when v_phone_key is not null then 'p:'||v_phone_key
      else 'n:'||lower(v_name)||':a:'||lower(coalesce(v_address,'')) end,0)
  );

  if v_phone_key is not null then
   select count(*),min(c.id::text)::uuid,min(c.name)
     into v_match_count,v_matched_id,v_matched_name
   from public.customers c
   where (
    case
     when regexp_replace(coalesce(c.phone,''),'[^0-9]','','g') ~ '^(94)?7[0-9]{8}$'
       or regexp_replace(coalesce(c.phone,''),'[^0-9]','','g') ~ '^07[0-9]{8}$'
     then right(regexp_replace(c.phone,'[^0-9]','','g'),9)
     else nullif(regexp_replace(coalesce(c.phone,''),'[^0-9]','','g'),'')
    end
   ) = v_phone_key;
   if v_match_count > 0 then
    if v_match_count = 1 and lower(btrim(v_matched_name)) = lower(v_name) then
     v_customer := v_matched_id;
    else
     raise exception 'Customer with this phone already exists. Please search and select the existing customer.' using errcode='22023';
    end if;
   end if;
  else
   select count(*),min(c.id::text)::uuid into v_match_count,v_matched_id
   from public.customers c
   where lower(btrim(c.name))=lower(v_name)
    and lower(btrim(coalesce(c.address,'')))=lower(coalesce(v_address,''));
   if v_match_count = 1 then v_customer := v_matched_id;
   elsif v_match_count > 1 then
     raise exception 'Several customers match this name and place. Select an existing customer.' using errcode='22023';
   end if;
  end if;

  if v_customer is null then
   insert into public.customers(name,phone,address)
    values (v_name,v_phone,v_address)
    returning id into v_customer;
   v_created := true;
  end if;
 end if;

 v_job_number := 'CCTV-'||upper(substr(replace(pg_catalog.gen_random_uuid()::text,'-',''),1,12));
 insert into public.jobs(job_number,title,customer_id,kind,priority,request_section,description,site_address,created_by)
 values (v_job_number,btrim(p_title),v_customer,p_kind::public.job_kind,p_priority,
         p_request_section,nullif(btrim(coalesce(p_description,'')),''),
         nullif(btrim(coalesce(p_site_address,'')),''),v_actor);
 return pg_catalog.jsonb_build_object(
  'job_number',v_job_number,'customer_id',v_customer,'customer_created',v_created
 );
end
$function$;
REVOKE ALL ON FUNCTION public.create_job_with_customer(uuid,text,text,text,text,text,text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.create_job_with_customer(uuid,text,text,text,text,text,text,text,text,text) TO authenticated;
NOTIFY pgrst,'reload schema';
