import "server-only";

/**
 * Adaptateur OpenSign côté serveur.
 * Les endpoints et le schéma de payload doivent être validés avec la version
 * d'OpenSign effectivement déployée avant activation en production.
 */
const baseUrl = process.env.OPENSIGN_BASE_URL;
const token = process.env.OPENSIGN_API_TOKEN;

export function isOpenSignConfigured() {
  return Boolean(baseUrl && token);
}

export async function createOpenSignRequest(_input: {
  name: string;
  email: string;
  documentUrl: string;
}) {

  void _input;
  if (!isOpenSignConfigured()) {
    throw new Error("OpenSign n'est pas configuré. Renseignez OPENSIGN_BASE_URL et OPENSIGN_API_TOKEN.");
  }

  // Point d'intégration volontairement non exécuté tant que le contrat API
  // de l'instance OpenSign cible n'a pas été confirmé.
  throw new Error("Connecteur OpenSign en attente de validation du endpoint et du payload de votre instance.");
}
