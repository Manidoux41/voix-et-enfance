-- A executer uniquement dans une base locale jetable avec les migrations 001-004.
begin;
insert into auth.users (id) values
  ('00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000002'),
  ('00000000-0000-4000-8000-000000000003');
insert into public.admin_users (user_id,role) values
  ('00000000-0000-4000-8000-000000000001','admin'),
  ('00000000-0000-4000-8000-000000000002','admin');

create function pg_temp.expect_failure(statement text) returns void language plpgsql as $$
declare failed boolean := false;
begin
  begin execute statement; exception when others then failed := true; end;
  if not failed then raise exception 'Operation non refusee : %', statement; end if;
end;
$$;

select public.register_site_document('00000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Document test','v1','original/test1.pdf',repeat('a',64));
select public.register_site_document('00000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','Document test','v2','original/test2.pdf',repeat('b',64));
select public.activate_site_document('00000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001');
select public.activate_site_document('00000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002');
select pg_temp.expect_failure($test$select public.activate_site_document('00000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001')$test$);
select pg_temp.expect_failure($test$select public.activate_site_document('00000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000009')$test$);

insert into public.signatories (id,organization_name,organization_type,representative_name,representative_role,email,status)
values ('20000000-0000-4000-8000-000000000001','Association test','Association','Representant','President','private@example.org','pending_signature');
select pg_temp.expect_failure($test$select public.set_signatory_publication('00000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',true)$test$);
update public.signatories set status='signed' where id='20000000-0000-4000-8000-000000000001';
select pg_temp.expect_failure($test$select public.set_signatory_publication('00000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',true)$test$);
insert into public.signatures (signatory_id,status,email_verified_at,signed_at,signed_pdf_path,signed_pdf_hash)
values ('20000000-0000-4000-8000-000000000001','signed',now(),now(),'private/test.pdf',repeat('c',64));
select public.set_signatory_publication('00000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',true);
do $$
begin
  if (select count(*) from public.published_structures) <> 1 then raise exception 'Publication absente'; end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='published_structures' and column_name in ('email','representative_name','signed_pdf_path')) then raise exception 'Donnees personnelles dans la vue publique'; end if;
end;
$$;
select public.set_signatory_publication('00000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',false);
do $$ begin if exists (select 1 from public.published_structures) then raise exception 'Retrait de publication non applique'; end if; end; $$;
select public.save_site_content('00000000-0000-4000-8000-000000000001','home','{"title":"Titre test"}',0);
select pg_temp.expect_failure($test$select public.save_site_content('00000000-0000-4000-8000-000000000001','home','{"title":"Ecrasement concurrent"}',0)$test$);
select public.save_site_content('00000000-0000-4000-8000-000000000001','home','{"title":"Titre suivant"}',1);
select pg_temp.expect_failure($test$select public.set_site_admin('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001',null)$test$);
select public.set_site_admin('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002',null);
select pg_temp.expect_failure($test$select public.activate_site_document('00000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001')$test$);
select public.set_site_admin('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000003','admin');

do $$
begin
  if (select count(*) from public.documents where is_active) <> 1 then raise exception 'Document actif non unique'; end if;
  if not (select is_active from public.documents where id='10000000-0000-4000-8000-000000000002') then raise exception 'Mauvaise version active'; end if;
  if not (select is_public from public.documents where id='10000000-0000-4000-8000-000000000001') then raise exception 'Ancienne version publique perdue'; end if;
  if (select revision from public.site_content where page='home') <> 2 then raise exception 'Revision incorrecte'; end if;
  if (select count(*) from public.audit_logs where actor_id='00000000-0000-4000-8000-000000000001') <> 10 then raise exception 'Audit incomplet ou non atomique'; end if;
  if has_table_privilege('anon','public.published_structures','SELECT') or has_table_privilege('authenticated','public.signatories','SELECT') then raise exception 'Privilege public excessif'; end if;
  if has_function_privilege('authenticated','public.set_site_admin(uuid,uuid,text)','EXECUTE') then raise exception 'Fonction admin exposee'; end if;
  if not has_function_privilege('service_role','public.set_site_admin(uuid,uuid,text)','EXECUTE') then raise exception 'Fonction admin inaccessible au serveur'; end if;
end;
$$;
insert into public.signatories (id,organization_name,organization_type,representative_name,representative_role,email,status)
values ('20000000-0000-4000-8000-000000000002','A supprimer','Association','Test','Test','test@example.invalid','pending_signature');
insert into public.signatures (signatory_id,status,otp_hash)
values ('20000000-0000-4000-8000-000000000002','otp_pending','test-hash');
select pg_temp.expect_failure($test$select public.delete_pending_signatory('00000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002')$test$);
select pg_temp.expect_failure($test$select public.delete_pending_signatory('00000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001')$test$);
update public.signatures set signed_pdf_hash = repeat('d',64) where signatory_id='20000000-0000-4000-8000-000000000002';
select pg_temp.expect_failure($test$select public.delete_pending_signatory('00000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002')$test$);
update public.signatures set signed_pdf_hash = null where signatory_id='20000000-0000-4000-8000-000000000002';
select public.delete_pending_signatory('00000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002');
do $$
begin
  if exists (select 1 from public.signatories where id='20000000-0000-4000-8000-000000000002')
    or exists (select 1 from public.signatures where signatory_id='20000000-0000-4000-8000-000000000002') then
    raise exception 'Suppression incomplete';
  end if;
  if not exists (select 1 from public.audit_logs where action='signatory.pending_deleted' and entity_id='20000000-0000-4000-8000-000000000002') then
    raise exception 'Audit de suppression absent';
  end if;
  if has_function_privilege('authenticated','public.delete_pending_signatory(uuid,uuid)','EXECUTE') then
    raise exception 'Suppression accessible publiquement';
  end if;
end;
$$;
rollback;
