import "server-only";

/**
 * Adaptateur OpenSign côté serveur.
 * Les endpoints et le schéma de payload doivent être validés avec la version
 * d'OpenSign effectivement déployée avant activation en production.
 */

const baseUrl = process.env.OPENSIGN_BASE_URL;
const token = process.env.OPENSIGN_API_TOKEN;

type OpenSignRequestInput = {
  name: string;
  email: string;
  documentUrl: string;
};

export function isOpenSignConfigured(): boolean {
  return Boolean(baseUrl && token);
}

export async function createOpenSignRequest(
  input: OpenSignRequestInput,
): Promise<never> {
  // L'argument est volontairement conservé dans l'interface du futur connecteur.
  // Il sera envoyé à OpenSign lorsque le contrat API de l'instance sera validé.
  void input;

  if (!isOpenSignConfigured()) {
    throw new Error(
      "OpenSign n'est pas configuré. Renseignez OPENSIGN_BASE_URL et OPENSIGN_API_TOKEN.",
    );
  }

  throw new Error(
    "Connecteur OpenSign en attente de validation de l'endpoint et du payload de votre instance.",
  );
}