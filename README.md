# Voix & Enfance

Application Next.js de collecte de soutiens associatifs à une proposition de loi sur la protection de l'enfance.

## Inclus dans cette première version

- Page publique de présentation.
- Consultation intégrale du PDF de référence avant signature.
- Formulaire de soutien d'une association / d'un collectif.
- Mode démonstration sans clés API : les demandes sont enregistrées dans le navigateur (`localStorage`) et marquées « à connecter à OpenSign ».
- Tableau de bord administrateur privé, connecté à Supabase.
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

Les migrations sont gérées par Prisma dans `prisma/migrations`. Les fichiers de `supabase/migrations` sont conservés comme historique SQL ; ne plus les exécuter manuellement après la reprise décrite ci-dessous.

### Migrations automatiques avec Prisma

Prisma est utilisé uniquement pour versionner et appliquer le SQL. Les requêtes de l'application, Supabase Auth, Storage, les politiques RLS et les fonctions SQL restent inchangés. Le schéma Prisma ne définit donc pas de modèles ORM et ne doit pas servir à générer le schéma avec `db push` ou `migrate dev`.

1. Renseigner `DATABASE_URL` dans `.env.local` avec l'URI PostgreSQL de **Supabase > Connect** : connexion directe, ou pooler en **mode session** (port 5432) si le réseau ne permet pas l'IPv6. Ne pas utiliser le pooler en mode transaction (port 6543). Encoder les caractères spéciaux du mot de passe dans l'URI et conserver les paramètres TLS recommandés par Supabase. Cette connexion doit avoir les droits de migration sur `public` et les droits nécessaires sur `storage.buckets`. La clé API service role n'est pas une URL PostgreSQL.
   Si `DATABASE_URL` utilise un pooler transactionnel, renseigner cette connexion directe/session dans `DIRECT_URL` : les commandes de migration la privilégient automatiquement. Définir aussi `DIRECT_URL` dans Vercel Production dans ce cas. Une `DIRECT_URL` invalide bloque la migration, sans repli sur `DATABASE_URL`.
2. **Base existante : faire une sauvegarde et vérifier quelles migrations 001, 002 et 003 ont été intégralement appliquées**, y compris leurs fonctions, permissions et buckets. Marquer uniquement ce préfixe comme déjà appliqué, une seule fois :

   ```bash
   # Exemple : seules 001 et 002 ont déjà été exécutées.
   npm run db:baseline -- 002_electronic_signing
   npm run db:migrate
   npm run db:status
   ```

   Si seule 001 est appliquée, utiliser `001_initial_schema`. Si les trois sont déjà appliquées, utiliser `003_admin_dashboard`. La reprise enregistre ces migrations dans `_prisma_migrations` sans rejouer leur SQL ; elle ne vérifie pas la conformité réelle de la base. Une migration partiellement appliquée doit être réparée avant la reprise. Ne jamais marquer comme appliquée une migration manquante. Sur une **nouvelle base Supabase**, ignorer la reprise et lancer directement `npm run db:migrate`. Une base PostgreSQL sans les schémas/roles Supabase `auth` et `storage` n'est pas suffisante.
3. Sur Vercel, ajouter `DATABASE_URL` **uniquement dans l'environnement Production**, puis redéployer après la reprise. `vercel.json` fixe la commande de build à `npm run build` : le script `prebuild` lance `prisma migrate deploy` avant Next.js uniquement lorsque `VERCEL=1` et `VERCEL_ENV=production`. Les builds locaux et Preview ne migrent aucune base automatiquement. Ne pas remplacer cette commande par `next build`, qui contournerait le hook npm.

Les migrations déjà appliquées ne sont pas rejouées. Une configuration absente ou un échec Prisma bloque le build ; aucune erreur n'est ignorée. Prisma verrouille l'application des migrations pour éviter une exécution concurrente. Une migration ne revient pas en arrière si le build Next.js échoue ensuite : privilégier des changements SQL rétrocompatibles avec la version encore en ligne. Ne jamais exécuter `prisma migrate reset` sur une base contenant des données à conserver.

Pour une évolution, ajouter un dossier ordonné, par exemple `prisma/migrations/004_description/migration.sql`, contenant le SQL et une transaction `BEGIN` / `COMMIT` lorsque les instructions le permettent. Ne jamais modifier une migration déjà appliquée. Tester sur une base Supabase de développement séparée avec `npm run db:migrate`, puis livrer le dossier : Vercel appliquera les migrations manquantes au prochain build de production. Les trois migrations importées conservent le SQL historique, enveloppé dans une transaction pour éviter les applications partielles.

L'import du PDF, l'activation du document et la création du premier administrateur restent des opérations de mise en service manuelles ; aucun document ni compte n'est créé par le build.

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
2. Configurer Prisma et appliquer les migrations avec `npm run db:migrate` selon la procédure ci-dessus (reprise préalable pour une base existante).
3. Dans Supabase Storage, vérifier la création des buckets privés `signing-documents` et `signed-documents` par la migration. Téléverser `public/documents/proposition-loi-protection-enfance.pdf` dans `signing-documents`, chemin `original/proposition-loi-protection-enfance.pdf`.
4. Exécuter `supabase/ACTIVATION_SIGNATURES.sql` pour enregistrer la version active du document. Si le PDF est modifié, recalculer son SHA-256 (`shasum -a 256 fichier.pdf` sur macOS), téléverser la nouvelle version et créer une nouvelle ligne `documents` en désactivant l'ancienne.
5. Copier `.env.example` vers `.env.local` uniquement lors de la première configuration (ne pas écraser un fichier local existant) et renseigner `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `MAILJET_API_KEY`, `MAILJET_SECRET_KEY`, `EMAIL_FROM`, `OTP_HASH_SECRET` (32 caractères aléatoires minimum) et `NEXT_PUBLIC_APP_URL`. `EMAIL_FROM` doit contenir uniquement une adresse e-mail validée et Active dans Mailjet, sans nom ni chevrons. Ne jamais placer `SUPABASE_SERVICE_ROLE_KEY`, les clés Mailjet ou `OTP_HASH_SECRET` dans une variable `NEXT_PUBLIC_` ni les transmettre au navigateur.
6. Déclarer les mêmes variables dans Vercel (Production, Preview si nécessaire), puis redéployer.
7. Configurer Mailjet et vérifier un envoi réel avant d'ouvrir la collecte au public, selon la procédure ci-dessous.

Générer le secret OTP avec `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"` et conserver sa valeur pendant la durée de validité des codes : le changer rend les codes en attente invalides. Le secret local n'est pas automatiquement transmis à Vercel ; configurer également `OTP_HASH_SECRET` dans Vercel, puis redéployer.

Ne jamais publier `.env.local` ni des identifiants réels dans `.env.example`. Si des clés ou mots de passe ont déjà été publiés, les révoquer ou les renouveler auprès du fournisseur : nettoyer le fichier ne les supprime pas de l'historique.

### Configuration Mailjet

1. Créer un compte Mailjet (l'offre gratuite reste soumise à ses quotas et restrictions).
2. Dans « Mon compte → Ajout d'un domaine ou d'une adresse d'expéditeur », ajouter une **adresse d'expéditeur**, par exemple une adresse personnelle Gmail ou Outlook dont vous contrôlez la boîte. Cliquer sur le lien de confirmation et attendre le statut **Active**. Cela ne revient pas à authentifier `gmail.com` et ne nécessite pas d'acheter un domaine ; Mailjet peut toutefois imposer des restrictions ou une validation du compte.
3. Dans les paramètres API et SMTP, récupérer l'API Key et la Secret Key du compte auquel l'expéditeur est associé.
4. Ajouter dans `.env.local` et Vercel Production :

   ```env
   MAILJET_API_KEY=
   MAILJET_SECRET_KEY=
   EMAIL_FROM=adresse-expediteur-validee@example.com
   ```

   Remplir les valeurs uniquement dans ces espaces privés. `BREVO_API_KEY` n'est plus utilisée et peut être retirée. Ne pas écraser `.env.local` avec le fichier d'exemple. Après mise à jour des variables Vercel, déployer les changements de code.
5. Avant l'ouverture au public, faire une demande de test vers sa propre boîte via `/signer`, recevoir le code et vérifier l'adresse. Cette action crée une demande de test dans Supabase, pas une signature finalisée. Vérifier le statut de livraison dans Mailjet et les courriers indésirables. Aucun test automatique ne contacte Mailjet ou n'envoie de véritable code.

Le service partagé utilise directement l'API Mailjet v3.1 avec les deux clés en authentification Basic, sans SDK supplémentaire ni repli vers Brevo. Les OTP, les invitations administrateur et les autres appels à `sendTransactionalEmail` passent par ce service. Les textes légaux par défaut mentionnent Mailjet ; si les mentions légales ont été personnalisées en base, mettre également à jour le prestataire dans l'administration.

### Diagnostic des codes e-mail

La page de saisie du code s'affiche uniquement après confirmation de la prise en charge par Mailjet (statut `success` et `MessageUUID` pour le destinataire). Cette acceptation ne garantit pas la livraison. Les logs serveur Vercel contiennent « Courriel accepté par Mailjet » et un `messageId` correspondant au `MessageUUID`, également enregistré sous `email_message_id` dans l'événement d'audit `signature.requested`. Aucun code OTP ni clé API n'est journalisé. Les références Brevo des anciens événements restent inchangées.

Si le code n'arrive pas, relever cet identifiant dans Vercel puis consulter l'activité transactionnelle Mailjet (destinataire, date, statut ; le support peut aussi utiliser le UUID). Vérifier le compte auquel appartiennent les clés API de Vercel Production, les filtres de date, les rejets/blocages, l'expéditeur Active et les courriers indésirables. Un HTTP 401 signifie que l'authentification est refusée ; une clé locale ne met pas à jour Vercel et toute modification de variable exige un redéploiement. Un HTTP réussi contenant un statut de message `error` n'est pas considéré comme un envoi réussi. En l'absence d'identifiant côté Vercel, examiner l'erreur serveur plutôt que présumer une livraison.

### Limites et sécurité avant ouverture publique

- Ce MVP collecte une signature électronique simple, une vérification de contrôle de l'adresse e-mail, le consentement, la version du document et des éléments techniques de traçabilité. Il ne vérifie pas à lui seul l'identité civile ni le mandat du représentant.
- Il ne doit pas être présenté comme signature avancée ou qualifiée eIDAS. Pour un acte exigeant un niveau supérieur ou une présomption de fiabilité, recourir à un prestataire de services de confiance adapté.
- L'administration nécessite Supabase Auth et un compte confirmé autorisé dans `admin_users` avec le rôle `admin`. Le rôle historique `reviewer` ne donne pas accès au tableau de bord. Les téléchargements des PDF signés passent par des liens privés de 60 secondes.
- Ajouter avant campagne publique une limitation de débit centralisée (par IP et par adresse e-mail) sur la création de demandes et les OTP, une protection anti-robot, une politique de conservation/suppression, une notice RGPD complète et une revue de sécurité indépendante. Le compteur OTP limite les essais d'un code, mais ne remplace pas un rate limiter distribué.
- L'horodatage est l'heure serveur applicative, pas un horodatage électronique qualifié délivré par un prestataire de confiance.
- Le PDF final est le PDF source suivi d'une page d'attestation et de signature. Le hash SHA-256 du PDF source est vérifié avant assemblage et le hash du PDF final est enregistré.

### Portée juridique

L'article 25 du règlement eIDAS interdit de refuser à une signature un effet juridique ou une recevabilité comme preuve au seul motif de sa forme électronique ou de son niveau non qualifié. Cela ne signifie pas que tous les niveaux ont la même force probante : seule la signature électronique qualifiée a l'effet juridique équivalent à une signature manuscrite au sens de l'article 25, paragraphe 2. Les articles 1366 et 1367 du Code civil français exigent notamment que l'auteur puisse être dûment identifié et que l'intégrité de l'écrit soit garantie. L'outil doit donc être décrit avec exactitude et adapté au risque juridique de l'acte.

## Tableau de bord privé

### Mise en service

1. Appliquer les migrations Prisma avec `npm run db:migrate` (voir la reprise d'une base existante ci-dessus). La migration `003_admin_dashboard` ne publie aucune signature automatiquement. S'il existe plusieurs documents actifs, n'en conserver qu'un avant l'exécution : l'index unique interdit plusieurs versions actives.
2. Activer le fournisseur Email / Password dans Supabase Authentication. Désactiver les inscriptions publiques si elles ne sont pas nécessaires et utiliser un mot de passe administrateur fort.
3. Dans Authentication → Users, créer le premier compte administrateur avec son adresse confirmée et relever son UUID. Autoriser ce compte dans SQL Editor :

   ```sql
   insert into public.admin_users (user_id, role)
   values ('UUID_DU_COMPTE_SUPABASE', 'admin')
   on conflict (user_id) do update set role = 'admin';
   ```

4. Configurer `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` et `NEXT_PUBLIC_APP_URL` dans le serveur local et Vercel. `NEXT_PUBLIC_APP_URL` doit être l'URL exacte utilisée pour accéder à l'application (par exemple `https://votre-site.fr`) ; les mutations provenant d'une autre origine sont refusées. Pour une Preview Vercel, définir l'URL de cette Preview dans cet environnement. Si `NEXT_PUBLIC_APP_URL` est absente sur Vercel, l'administration utilise l'URL canonique fournie par `VERCEL_PROJECT_PRODUCTION_URL` en production ou `VERCEL_URL` en Preview, jamais l'en-tête envoyé par le navigateur. Un domaine personnalisé doit être explicitement configuré si l'URL canonique ne correspond pas. Après toute modification des variables Vercel, redéployer. Ne jamais exposer la clé service role.
5. Redéployer, puis ouvrir `/admin/login`. Le lien admin n'est pas dans la navigation publique, mais la protection réelle est le contrôle de session et de rôle côté serveur sur la page et chaque route administrative. Les cookies sont HttpOnly, SameSite=Lax et Secure en production.
6. Tester avec un compte autorisé et un compte non autorisé : ce dernier ne doit accéder ni aux demandes, ni aux exports, ni aux PDF privés.

### Fonctions

- Statistiques, recherche par nom de structure, filtres et pagination des demandes.
- Publication et retrait du registre public. Une publication exige une signature finalisée, un e-mail vérifié et une preuve PDF enregistrée. Seuls le nom et le type de la structure apparaissent dans le registre public ; les signatures antérieures finalisées peuvent être publiées individuellement.
- Téléchargement des PDF signés par liens privés temporaires (60 secondes). Ne pas partager ces liens ; les coordonnées et les PDF ne sont jamais affichés dans le registre public.
- Export CSV de l'ensemble du registre, y compris les données personnelles : stockage privé obligatoire. Les formules de tableur sont neutralisées.
- Export PDF privé de toutes les signatures finalisées depuis « Signatures », sans restriction aux structures publiées ni aux filtres de recherche. Le tableau comporte structure, type, représentant, fonction, date UTC et version signée, classés par date de signature croissante. Les codes en attente et les signatures sans preuve finalisée sont exclus.
- Dans « Documents PDF », chaque version propose un registre PDF séparé et une copie de la proposition avec ce registre en annexe. Ces exports par version incluent uniquement les signatures de cette version : une signature ancienne n'est jamais présentée comme portant sur une nouvelle proposition. Le tableau est paginé, avec en-tête répété, et se régénère à chaque téléchargement pour intégrer les signatures suivantes. Les PDF sources, les preuves individuelles signées et leurs empreintes ne sont jamais modifiés. Ces copies administratives ne constituent pas une nouvelle preuve cryptographique ni une signature PDF collective. Les exports contenant des noms de représentants restent privés et sont journalisés.
- Consultation paginée du journal d'audit. Publication, exports, liens de téléchargement, documents, autorisations et changements de contenu sont journalisés.
- Téléversement de PDF non chiffrés jusqu'à 3 Mo (limite adaptée à Vercel), calcul SHA-256, consultation et activation atomique d'une version. Une nouvelle version est d'abord privée ; son activation rend le PDF source public, mais jamais les PDF signés. Une version déjà rendue publique reste consultable après remplacement. Les versions ne sont pas écrasées ni supprimées pour préserver les preuves.
- Les pages de consultation et de signature utilisent le document actif. Le formulaire transmet l'identifiant du PDF présenté : si la version active a changé, la création est refusée et demande une nouvelle lecture. Les demandes déjà créées restent liées à leur PDF d'origine.
- Autorisation, promotion et révocation des comptes existants Supabase. Créer les nouveaux comptes dans Supabase Authentication avant de les autoriser dans le tableau. Impossible de révoquer son propre accès ou le dernier administrateur. La révocation est vérifiée à la prochaine requête.
- Dans « Comptes autorisés », créer aussi des administrateurs par invitation e-mail : Supabase génère un lien à usage unique, envoyé via Mailjet (`MAILJET_API_KEY`, `MAILJET_SECRET_KEY` et `EMAIL_FROM` doivent être configurés). Le destinataire ouvre `/admin/activate`, confirme le lien et choisit son mot de passe. Aucun mot de passe n'est envoyé par e-mail. Une invitation non utilisée peut être renvoyée en saisissant à nouveau la même adresse ; un compte déjà confirmé reste autorisable par UUID. Si l'envoi échoue, le compte peut déjà être autorisé, mais ne peut pas être activé sans le lien : l'interface signale explicitement cet état.
- Dans « Mon compte », modifier son mot de passe en confirmant le mot de passe actuel. Activation et changements de mot de passe exigent 12 à 128 caractères avec majuscule, minuscule, chiffre et symbole ; ils sont journalisés sans stocker les mots de passe. Une invitation révoquée ne permet pas l'accès. Le premier administrateur doit toujours être provisionné par une personne disposant des accès Supabase ; aucune route publique ne peut s'accorder ce rôle.
- Édition des textes de l'accueil, de la proposition, du formulaire, du registre et des mentions légales. Texte simple uniquement, sans HTML. Les consentements et preuves ne sont pas modifiables. Une révision évite d'écraser une modification concurrente. Les pages sont dynamiques : les changements apparaissent sans nouveau déploiement.

L'administration n'autorise pas à falsifier une signature ni à créer une signature manuellement. Les vérifications d'identité, la politique RGPD et les protections anti-abus de la collecte restent à finaliser avant une ouverture publique.

### Validation

```bash
npm run test:admin
npm run test:migrations
npm run lint -- src
npm run build
```

Les tests locaux simulent l'authentification et la base sans envoyer d'e-mails ni modifier Supabase. Ils ne remplacent pas la validation en environnement connecté après migration : connexion/déconnexion, publication/retrait d'une signature finalisée, contrôle du registre public, téléchargement privé, activation d'un PDF, édition des textes et révocation d'un deuxième compte.
