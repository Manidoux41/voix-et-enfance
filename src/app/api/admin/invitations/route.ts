import { NextResponse } from "next/server";
import { z } from "zod";
import { adminRoute } from "@/lib/admin/http";
import { AdminError, adminOrigin } from "@/lib/admin/auth";
import { sendTransactionalEmail } from "@/lib/signing/email";

export const POST = adminRoute(async (request, { db, user }) => {
  const { email } = z.object({ email: z.string().email().max(254) }).parse(await request.json());
  const origin = adminOrigin();
  const { data, error } = await db.auth.admin.generateLink({ type: "invite", email });
  if (error) {
    if (error.code === "email_exists") throw new AdminError("Ce compte existe déjà. Autorisez-le avec son UUID.", 409);
    throw error;
  }
  if (!data.user || !data.properties?.hashed_token) throw new Error("Le lien d’invitation n’a pas été confirmé par Supabase.");
  const { error: roleError } = await db.rpc("set_site_admin", {
    actor: user.id, target: data.user.id, access_role: "admin",
  });
  if (roleError) throw roleError;
  const link = `${origin}/admin/activate#token_hash=${encodeURIComponent(data.properties.hashed_token)}`;
  let messageId: string;
  try {
    messageId = await sendTransactionalEmail(email, "Invitation à administrer Voix & Enfance",
      `Bonjour,\n\nVous êtes invité à administrer Voix & Enfance. Choisissez votre mot de passe en ouvrant ce lien personnel à usage unique :\n\n${link}\n\nNe partagez pas ce lien. S’il a expiré, demandez une nouvelle invitation à l’administrateur.`);
  } catch (error) {
    console.error("Envoi de l’invitation administrateur impossible :", error);
    throw new AdminError("Compte autorisé, mais invitation non envoyée. Réessayez l’invitation avec la même adresse.", 503);
  }
  const { error: auditError } = await db.from("audit_logs").insert({
    actor_id: user.id, action: "admin.invitation_sent", entity_type: "admin_user",
    entity_id: data.user.id, metadata: { email_message_id: messageId },
  });
  if (auditError) {
    console.error("Journalisation de l’invitation impossible :", auditError);
    throw new AdminError("Invitation acceptée par Mailjet, mais journalisation impossible. Ne renvoyez pas immédiatement le lien.", 503);
  }
  return NextResponse.json({ ok: true }, { status: 201 });
});
