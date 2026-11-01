-- À exécuter après 001_initial_schema.sql et 002_electronic_signing.sql.
-- Étape préalable : téléverser le PDF dans Supabase Storage > signing-documents
-- sous le chemin original/proposition-loi-protection-enfance.pdf.
insert into public.documents (title, version, original_file_path, sha256_hash, is_active)
values ('Proposition de loi interassociative relative à la protection de l’enfance', '2026-10-31-v1', 'original/proposition-loi-protection-enfance.pdf', 'e5063ba42c41135367601bf190cb6123f0d90336c246f98a682765fd880c3fde', true)
on conflict do nothing;
