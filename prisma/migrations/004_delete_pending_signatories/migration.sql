BEGIN;

create or replace function public.delete_pending_signatory(actor uuid, target uuid) returns void
language plpgsql set search_path = public as $$
declare entry public.signatories; deleted_signatures integer;
begin
  perform public.assert_site_admin(actor);
  select * into entry from public.signatories where id = target for update;
  if not found then raise exception 'Demande introuvable'; end if;
  if entry.status not in ('submitted', 'pending_signature') or entry.published_at is not null then
    raise exception 'Seules les demandes en attente non publiees peuvent etre supprimees';
  end if;
  perform id from public.signatures where signatory_id = target for update;
  if exists (
    select 1 from public.signatures where signatory_id = target and (
      status not in ('not_started', 'otp_pending', 'verified', 'expired')
      or signed_at is not null or signed_pdf_path is not null
      or signed_pdf_hash is not null or signature_image_hash is not null
      or certificate_path is not null
    )
  ) then raise exception 'Une demande comportant une signature ou une preuve ne peut pas etre supprimee'; end if;
  delete from public.signatures where signatory_id = target;
  get diagnostics deleted_signatures = row_count;
  delete from public.signatories where id = target;
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
    values (actor, 'signatory.pending_deleted', 'signatory', target,
      jsonb_build_object('previous_status', entry.status, 'deleted_signatures', deleted_signatures));
end;
$$;

revoke all on function public.delete_pending_signatory(uuid,uuid) from public, anon, authenticated;
grant execute on function public.delete_pending_signatory(uuid,uuid) to service_role;

COMMIT;
