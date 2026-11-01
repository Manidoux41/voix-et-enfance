# Voix & Enfance

Application Next.js de collecte de soutiens associatifs à une proposition de loi sur la protection de l'enfance.

## Inclus dans cette première version

- Page publique de présentation.
- Consultation intégrale du PDF de référence avant signature.
- Formulaire de soutien d'une association / d'un collectif.
- Mode démonstration sans clés API : les demandes sont enregistrées dans le navigateur (`localStorage`) et marquées « à connecter à OpenSign ».
- Tableau de bord administrateur de démonstration.
- Exemples de routes API et adaptateur OpenSign côté serveur.
- Schéma SQL initial Supabase.

> Important : sans configuration Supabase et OpenSign, cette version est un prototype local. Elle ne collecte pas de signatures juridiquement finalisées, n'envoie aucun e-mail et ne doit pas être utilisée pour une collecte publique en production. Le statut « demande enregistrée » n'est pas une signature.

## Prérequis

- Node.js 20.9 ou supérieur
- npm

## Installation

```bash
npm install
cp .env.example .env.local
npm run dev
```

Ouvrir http://localhost:3000.

## PDF de référence

Le PDF fourni a été copié dans `public/documents/proposition-loi-protection-enfance.pdf`. Le lecteur est accessible depuis l'accueil et depuis `/proposition`.

## Activation de Supabase et OpenSign

Les points d'intégration sont volontairement isolés :

- `src/lib/supabase/server.ts`
- `src/lib/opensign/client.ts`
- `src/app/api/signatories/route.ts`
- `src/app/api/opensign/webhook/route.ts`

Le schéma de départ est dans `supabase/migrations/001_initial_schema.sql`.

Les noms et formats exacts des endpoints OpenSign devront être confirmés avec la version OpenSign installée et sa documentation API avant activation. Le code fourni n'envoie pas de requête de signature tant que les variables nécessaires ne sont pas configurées.

## Sécurité à terminer avant production

1. Activer Supabase Auth pour les administrateurs.
2. Appliquer les politiques RLS du schéma et les tester.
3. Stocker le PDF signé et les certificats dans un bucket privé.
4. Vérifier les webhooks OpenSign (signature/HMAC selon la version).
5. Vérifier le statut de signature côté serveur auprès d'OpenSign ; ne jamais se fier au retour navigateur.
6. Ajouter limitation de débit, CAPTCHA/anti-spam, vérification d'e-mail et journal d'audit.
7. Faire vérifier le parcours et les mentions RGPD.
8. Faire confirmer au destinataire parlementaire le format de preuve attendu.

## Structure

```text
src/
  app/
    (public)/       Pages publiques
    admin/          Tableau de bord de démonstration
    api/             Routes serveur
  components/       Composants d'interface
  lib/               Adaptateurs et validations
  types/             Types métier
supabase/
  migrations/        Schéma SQL
public/documents/    PDF de référence
```

## Signature électronique interne (MVP)

Le projet remplace le stockage local du formulaire par un parcours serveur : création d'une demande, code e-mail à usage unique (10 minutes, 5 essais maximum), confirmation, signature manuscrite sur écran, génération du PDF final et journal d'événements. La signature est rattachée à la version active du PDF par son empreinte SHA-256. Les fichiers originaux et signés sont conservés dans deux buckets Supabase privés.

### Configuration

1. Installer les dépendances : `npm install` (ajoute notamment `pdf-lib`).
2. Dans Supabase SQL Editor, exécuter dans l'ordre `supabase/migrations/001_initial_schema.sql`, puis `supabase/migrations/002_electronic_signing.sql`.
3. Dans Supabase Storage, vérifier la création des buckets privés `signing-documents` et `signed-documents` par la migration. Téléverser `public/documents/proposition-loi-protection-enfance.pdf` dans `signing-documents`, chemin `original/proposition-loi-protection-enfance.pdf`.
4. Exécuter `supabase/ACTIVATION_SIGNATURES.sql` pour enregistrer la version active du document. Si le PDF est modifié, recalculer son SHA-256 (`shasum -a 256 fichier.pdf` sur macOS), téléverser la nouvelle version et créer une nouvelle ligne `documents` en désactivant l'ancienne.
5. Copier `.env.example` vers `.env.local` et renseigner `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`, `OTP_HASH_SECRET` (32 caractères aléatoires minimum) et `NEXT_PUBLIC_APP_URL`. Ne jamais placer `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY` ou `OTP_HASH_SECRET` dans une variable `NEXT_PUBLIC_` ni les transmettre au navigateur.
6. Déclarer les mêmes variables dans Vercel (Production, Preview si nécessaire), puis redéployer.
7. Vérifier le domaine expéditeur Resend avant d'envoyer des codes à des signataires réels.

### Limites et sécurité avant ouverture publique

- Ce MVP collecte une signature électronique simple, une vérification de contrôle de l'adresse e-mail, le consentement, la version du document et des éléments techniques de traçabilité. Il ne vérifie pas à lui seul l'identité civile ni le mandat du représentant.
- Il ne doit pas être présenté comme signature avancée ou qualifiée eIDAS. Pour un acte exigeant un niveau supérieur ou une présomption de fiabilité, recourir à un prestataire de services de confiance adapté.
- L'administration est volontairement désactivée dans cette livraison : l'ancien écran local n'est pas une administration sécurisée. Avant production, activer Supabase Auth, contrôler le rôle `admin_users` côté serveur, mettre en place la consultation sécurisée des dossiers et les téléchargements signés temporisés.
- Ajouter avant campagne publique une limitation de débit centralisée (par IP et par adresse e-mail) sur la création de demandes et les OTP, une protection anti-robot, une politique de conservation/suppression, une notice RGPD complète et une revue de sécurité indépendante. Le compteur OTP limite les essais d'un code, mais ne remplace pas un rate limiter distribué.
- L'horodatage est l'heure serveur applicative, pas un horodatage électronique qualifié délivré par un prestataire de confiance.
- Le PDF final est le PDF source suivi d'une page d'attestation et de signature. Le hash SHA-256 du PDF source est vérifié avant assemblage et le hash du PDF final est enregistré.

### Portée juridique

L'article 25 du règlement eIDAS interdit de refuser à une signature un effet juridique ou une recevabilité comme preuve au seul motif de sa forme électronique ou de son niveau non qualifié. Cela ne signifie pas que tous les niveaux ont la même force probante : seule la signature électronique qualifiée a l'effet juridique équivalent à une signature manuscrite au sens de l'article 25, paragraphe 2. Les articles 1366 et 1367 du Code civil français exigent notamment que l'auteur puisse être dûment identifié et que l'intégrité de l'écrit soit garantie. L'outil doit donc être décrit avec exactitude et adapté au risque juridique de l'acte.
