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
