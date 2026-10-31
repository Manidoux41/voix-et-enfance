create extension if not exists pgcrypto;

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  version text not null,
  original_file_path text not null,
  sha256_hash text not null,
  published_at timestamptz not null default now(),
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.signatories (
  id uuid primary key default gen_random_uuid(),
  organization_name text not null,
  organization_type text not null,
  representative_name text not null,
  representative_role text not null,
  email text not null,
  phone text,
  address text,
  website text,
  reading_confirmed_at timestamptz,
  authority_confirmed_at timestamptz,
  support_confirmed_at timestamptz,
  status text not null default 'submitted'
    check (status in ('submitted','pending_signature','signed','rejected','withdrawn')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.signatures (
  id uuid primary key default gen_random_uuid(),
  signatory_id uuid not null references public.signatories(id) on delete restrict,
  opensign_document_id text,
  opensign_signer_id text,
  status text not null default 'not_started',
  signed_at timestamptz,
  signed_pdf_path text,
  certificate_path text,
  document_hash text,
  consent_version text,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  role text not null default 'admin' check (role in ('admin','reviewer')),
  created_at timestamptz not null default now()
);

-- RLS activée par défaut. Ajouter des policies testées avant d'exposer l'API.
alter table public.documents enable row level security;
alter table public.signatories enable row level security;
alter table public.signatures enable row level security;
alter table public.audit_logs enable row level security;
alter table public.admin_users enable row level security;

-- Aucune policy publique n'est créée volontairement : les écritures passent
-- par des routes serveur contrôlées avec la clé service_role.
