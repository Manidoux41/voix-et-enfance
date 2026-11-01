BEGIN;

create or replace function public.delete_pending_signatories(actor uuid, targets uuid[]) returns void
language plpgsql set search_path = public as $$
declare target uuid;
begin
  perform public.assert_site_admin(actor);
  if targets is null or cardinality(targets) < 1 or cardinality(targets) > 25
    or array_position(targets, null) is not null then
    raise exception 'Selection invalide : choisir entre 1 et 25 demandes';
  end if;
  for target in select distinct value from unnest(targets) as selected(value) order by value loop
    perform public.delete_pending_signatory(actor, target);
  end loop;
end;
$$;

revoke all on function public.delete_pending_signatories(uuid,uuid[]) from public, anon, authenticated;
grant execute on function public.delete_pending_signatories(uuid,uuid[]) to service_role;

COMMIT;
