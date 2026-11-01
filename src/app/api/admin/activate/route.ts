import { NextResponse } from "next/server";
import { z } from "zod";
import { AdminError, createSessionClient, requireAdmin, requireSameOrigin } from "@/lib/admin/auth";
import { passwordFields } from "@/lib/admin/password";

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const input = passwordFields.and(z.object({ tokenHash: z.string().min(1).max(2048) })).parse(await request.json());
    const client = await createSessionClient(true);
    const { error } = await client.auth.verifyOtp({ token_hash: input.tokenHash, type: "invite" });
    if (error) throw new AdminError("Invitation invalide ou expirée. Demandez une nouvelle invitation.", 400);
    try {
      const { user, db } = await requireAdmin(true);
      const { error: updateError } = await client.auth.updateUser({ password: input.password });
      if (updateError) throw updateError;
      const { error: auditError } = await db.from("audit_logs").insert({
        actor_id: user.id, action: "admin.activated", entity_type: "admin_user", entity_id: user.id,
      });
      if (auditError) {
        console.error("Journalisation de l’activation impossible :", auditError);
        throw new AdminError("Mot de passe enregistré, mais journalisation impossible. Connectez-vous avec ce mot de passe.", 503);
      }
    } catch (error) {
      const { error: logoutError } = await client.auth.signOut();
      if (logoutError) console.error("Fermeture de session après activation refusée :", logoutError);
      throw error;
    }
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const status = error instanceof AdminError ? error.status : error instanceof z.ZodError || error instanceof SyntaxError ? 400 : 503;
    if (status === 503) console.error("Activation administrateur impossible :", error);
    return NextResponse.json({ error: error instanceof AdminError ? error.message
      : status === 400 ? "Utilisez un mot de passe de 12 à 128 caractères avec majuscule, minuscule, chiffre et symbole, puis confirmez-le."
        : "Activation impossible. Demandez une nouvelle invitation." },
    { status, headers: { "Cache-Control": "private, no-store" } });
  }
}
