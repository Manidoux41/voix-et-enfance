BEGIN;

-- Extension du modèle de signature interne Voix & Enfance.
-- Exécuter après 001_initial_schema.sql.
alter table public.signatures
  add column if not exists document_id uuid references public.documents(id) on delete restrict,
  add column if not exists otp_hash text,
  add column if not exists otp_expires_at timestamptz,
  add column if not exists otp_attempts integer not null default 0,
  add column if not exists email_verified_at timestamptz,
  add column if not exists signed_pdf_hash text,
  add column if not exists signature_image_hash text,
  add column if not exists consent_text text,
  add column if not exists ip_address text,
  add column if not exists user_agent text;

alter table public.signatures drop constraint if exists signatures_status_check;
alter table public.signatures add constraint signatures_status_check
  check (status in ('not_started','otp_pending','verified','signed','rejected','expired'));

create index if not exists signatories_email_idx on public.signatories (lower(email));
create index if not exists signatories_status_created_idx on public.signatories (status, created_at desc);
create index if not exists signatures_signatory_idx on public.signatures (signatory_id);

-- Buckets privés. Les opérations sont faites exclusivement avec la service role
-- dans les routes serveur. Ne créez aucune policy publique de lecture.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('signing-documents', 'signing-documents', false, 15728640, array['application/pdf']),
  ('signed-documents', 'signed-documents', false, 15728640, array['application/pdf'])
on conflict (id) do update set public = false;

-- Journal d'audit append-only au niveau des privilèges applicatifs.
revoke update, delete on public.audit_logs from anon, authenticated;
revoke all on public.signatures from anon, authenticated;
revoke all on public.signatories from anon, authenticated;
revoke all on public.documents from anon, authenticated;

COMMIT;
