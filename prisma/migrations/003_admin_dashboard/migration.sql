BEGIN;

-- Executer apres 001 et 002. Les fonctions ne sont accessibles que cote serveur.
alter table public.signatories add column if not exists published_at timestamptz;
create index if not exists signatories_published_idx on public.signatories (published_at desc) where published_at is not null;
create unique index if not exists documents_one_active_idx on public.documents (is_active) where is_active;
alter table public.documents add column if not exists is_public boolean not null default false;
update public.documents set is_public = true where is_active or exists (select 1 from public.signatures where document_id = documents.id);

create or replace view public.published_structures with (security_invoker = true) as
  select s.organization_name, s.organization_type, s.published_at, s.id
  from public.signatories s
  where s.status = 'signed' and s.published_at is not null and exists (
    select 1 from public.signatures sig where sig.signatory_id = s.id and sig.status = 'signed'
      and sig.email_verified_at is not null and sig.signed_at is not null
      and sig.signed_pdf_path is not null and sig.signed_pdf_hash is not null
  );
revoke all on public.published_structures from public, anon, authenticated;
grant select on public.published_structures to service_role;

create table if not exists public.site_content (
  page text primary key check (page in ('home','proposition','signer','signataires','legal')),
  content jsonb not null check (jsonb_typeof(content) = 'object'),
  revision integer not null default 1,
  updated_at timestamptz not null default now()
);
alter table public.site_content enable row level security;
revoke all on public.site_content, public.admin_users from anon, authenticated;
grant all on public.site_content, public.admin_users to service_role;

create or replace function public.assert_site_admin(actor uuid) returns void
language plpgsql set search_path = public as $$
begin
  if not exists (select 1 from public.admin_users where user_id = actor and role = 'admin') then
    raise exception 'Administrateur non autorise';
  end if;
end;
$$;

create or replace function public.set_signatory_publication(actor uuid, target uuid, publish boolean) returns void
language plpgsql set search_path = public as $$
declare entry public.signatories;
begin
  perform public.assert_site_admin(actor);
  select * into entry from public.signatories where id = target for update;
  if not found then raise exception 'Demande introuvable'; end if;
  if publish and (entry.status <> 'signed' or not exists (
    select 1 from public.signatures where signatory_id = target and status = 'signed'
      and email_verified_at is not null and signed_at is not null
      and signed_pdf_path is not null and signed_pdf_hash is not null
  )) then raise exception 'Seules les signatures finalisees peuvent etre publiees'; end if;
  update public.signatories set published_at = case when publish then coalesce(published_at, now()) else null end,
    updated_at = now() where id = target;
  insert into public.audit_logs (actor_id, action, entity_type, entity_id)
    values (actor, case when publish then 'signatory.published' else 'signatory.unpublished' end, 'signatory', target);
end;
$$;

create or replace function public.register_site_document(actor uuid, target uuid, doc_title text, doc_version text, file_path text, file_hash text) returns void
language plpgsql set search_path = public as $$
begin
  perform public.assert_site_admin(actor);
  insert into public.documents (id,title,version,original_file_path,sha256_hash,is_active)
    values (target,doc_title,doc_version,file_path,file_hash,false);
  insert into public.audit_logs (actor_id,action,entity_type,entity_id,metadata)
    values (actor,'document.uploaded','document',target,jsonb_build_object('sha256_hash',file_hash,'version',doc_version));
end;
$$;

create or replace function public.activate_site_document(actor uuid, target uuid) returns void
language plpgsql set search_path = public as $$
begin
  perform pg_advisory_xact_lock(726101);
  perform public.assert_site_admin(actor);
  if not exists (select 1 from public.documents where id = target) then raise exception 'Document introuvable'; end if;
  update public.documents set is_active = false where is_active;
  update public.documents set is_active = true, is_public = true, published_at = now() where id = target;
  insert into public.audit_logs (actor_id,action,entity_type,entity_id) values (actor,'document.activated','document',target);
end;
$$;

create or replace function public.set_site_admin(actor uuid, target uuid, access_role text) returns void
language plpgsql set search_path = public as $$
begin
  perform pg_advisory_xact_lock(726102);
  perform public.assert_site_admin(actor);
  if access_role is not null and access_role not in ('admin','reviewer') then raise exception 'Role invalide'; end if;
  if actor = target and access_role is distinct from 'admin' then raise exception 'Vous ne pouvez pas retirer vos propres droits'; end if;
  if access_role is null then
    delete from public.admin_users where user_id = target;
    if not found then raise exception 'Compte non autorise'; end if;
  else
    insert into public.admin_users (user_id,role) values (target,access_role)
      on conflict (user_id) do update set role = excluded.role;
  end if;
  if not exists (select 1 from public.admin_users where role = 'admin') then raise exception 'Un administrateur doit etre conserve'; end if;
  insert into public.audit_logs (actor_id,action,entity_type,entity_id,metadata)
    values (actor,case when access_role is null then 'admin.revoked' else 'admin.authorized' end,'admin_user',target,jsonb_build_object('role',access_role));
end;
$$;

create or replace function public.save_site_content(actor uuid, target_page text, fields jsonb, expected_revision integer) returns integer
language plpgsql set search_path = public as $$
declare current_revision integer; next_revision integer;
begin
  perform pg_advisory_xact_lock(726103);
  perform public.assert_site_admin(actor);
  select revision into current_revision from public.site_content where page = target_page;
  if coalesce(current_revision,0) <> expected_revision then raise exception 'Contenu modifie par un autre administrateur. Rechargez la page'; end if;
  next_revision := coalesce(current_revision,0) + 1;
  insert into public.site_content (page,content,revision) values (target_page,fields,next_revision)
    on conflict (page) do update set content = excluded.content, revision = excluded.revision, updated_at = now();
  insert into public.audit_logs (actor_id,action,entity_type,metadata)
    values (actor,'content.updated','site_content',jsonb_build_object('page',target_page,'revision',next_revision));
  return next_revision;
end;
$$;

revoke all on function public.assert_site_admin(uuid) from public, anon, authenticated;
revoke all on function public.set_signatory_publication(uuid,uuid,boolean) from public, anon, authenticated;
revoke all on function public.register_site_document(uuid,uuid,text,text,text,text) from public, anon, authenticated;
revoke all on function public.activate_site_document(uuid,uuid) from public, anon, authenticated;
revoke all on function public.set_site_admin(uuid,uuid,text) from public, anon, authenticated;
revoke all on function public.save_site_content(uuid,text,jsonb,integer) from public, anon, authenticated;
grant execute on function public.assert_site_admin(uuid) to service_role;
grant execute on function public.set_signatory_publication(uuid,uuid,boolean) to service_role;
grant execute on function public.register_site_document(uuid,uuid,text,text,text,text) to service_role;
grant execute on function public.activate_site_document(uuid,uuid) to service_role;
grant execute on function public.set_site_admin(uuid,uuid,text) to service_role;
grant execute on function public.save_site_content(uuid,text,jsonb,integer) to service_role;

COMMIT;
