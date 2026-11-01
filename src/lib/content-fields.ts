export const contentDefaults = {
  home: {
    eyebrow: "Initiative interassociative · Protection de l'enfance",
    title: "Faire entendre une voix commune pour l'enfance.",
    introduction: "Une proposition de loi portée collectivement pour clarifier les critères du danger justifiant une mesure d'assistance éducative, renforcer le contrôle indépendant et améliorer le pilotage national de la protection de l'enfance.",
    collectiveTitle: "Une démarche collective",
    collectiveText: "Les associations et collectifs peuvent prendre connaissance du texte puis exprimer le soutien de leur structure.",
    textTitle: "Un texte commun", textDescription: "Une proposition structurée en cinq articles",
    mobilizationTitle: "Une mobilisation associative", mobilizationDescription: "Chaque structure signe en son nom",
    transparencyTitle: "Une démarche transparente", transparencyDescription: "Consultation du document avant soutien",
    objectivesTitle: "Les objectifs de l'initiative",
    objectivesText: "Le texte soumis à la signature des associations, collectifs et organisations engagés dans la protection des enfants et le respect des droits des familles s'articule autour de trois axes.",
    dangerTitle: "Clarifier la notion de danger",
    dangerText: "Préciser les critères d'appréciation du danger à partir d'éléments précis, objectifs, circonstanciés et actualisés.",
    controlTitle: "Instaurer un contrôle indépendant",
    controlText: "Prévoir un regard national indépendant sur le fonctionnement des services de protection de l'enfance.",
    coordinationTitle: "Renforcer le pilotage national",
    coordinationText: "Améliorer la coordination interministérielle, le suivi des engagements et la transparence des politiques publiques.",
    ctaTitle: "Prenez connaissance du texte",
    ctaText: "Le PDF complet est consultable avant toute démarche de signature.",
  },
  proposition: {
    title: "La proposition de loi",
    introduction: "Consultez le document intégral avant de décider si votre structure souhaite soutenir cette initiative.",
    notice: "Prenez le temps de lire le document intégral. Le formulaire de soutien vous demandera de confirmer que vous avez pris connaissance de cette version du texte.",
  },
  signer: {
    title: "Soutenir la proposition",
    introduction: "Cette démarche est réservée aux représentants habilités d'associations, collectifs et organisations.",
    formTitle: "Informations de la structure",
    formIntroduction: "Complétez les informations ci-dessous. Les champs marqués d'un astérisque sont obligatoires.",
  },
  signataires: {
    title: "Les structures signataires",
    introduction: "Les structures ci-dessous ont finalisé leur signature et leur publication a été validée par un administrateur.",
    registerTitle: "Registre public",
  },
  legal: {
    title: "Informations et confidentialité",
    introduction: "Informations à compléter par le responsable de l'initiative avant toute ouverture publique.",
    privacyTitle: "Protection des données",
    privacyText: "Les demandes et les signatures sont enregistrées dans Supabase. Brevo est utilisé pour l'envoi des codes de vérification par e-mail. Seuls le nom et le type des structures validées sont publiés. Les coordonnées des représentants et les PDF signés restent privés. Le responsable de traitement doit compléter les finalités, la base légale, les destinataires, les durées de conservation, les droits des personnes et les coordonnées de contact avant toute collecte publique.",
    publisherTitle: "Mentions légales",
    publisherText: "Éditeur, hébergeur et coordonnées de contact à compléter par le porteur de l'initiative avant publication.",
  },
};
export type ContentPage = keyof typeof contentDefaults;
export type ContentRecord = { page: ContentPage; fields: Record<string, string>; revision: number };
export const pageLabels: Record<ContentPage, string> = { home: "Accueil", proposition: "Proposition", signer: "Formulaire de soutien", signataires: "Registre public", legal: "Mentions légales et confidentialité" };
