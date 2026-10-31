import { NextResponse } from "next/server";

/**
 * À compléter après vérification du mécanisme de signature des webhooks
 * de la version OpenSign déployée. Ne pas accepter un statut transmis
 * sans authentification cryptographique.
 */
export async function POST() {
  if (!process.env.OPENSIGN_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Webhook OpenSign non configuré" }, { status: 503 });
  }
  return NextResponse.json({ error: "Vérification webhook à implémenter pour l'instance cible" }, { status: 501 });
}
