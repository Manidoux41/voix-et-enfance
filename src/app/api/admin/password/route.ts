import { NextResponse } from "next/server";
import { z } from "zod";
import { adminRoute } from "@/lib/admin/http";
import { AdminError, createSessionClient } from "@/lib/admin/auth";
import { passwordFields } from "@/lib/admin/password";

export const PUT = adminRoute(async (request, { user, db }) => {
  const input = passwordFields.and(z.object({ currentPassword: z.string().min(1).max(256) })).parse(await request.json());
  if (!user.email) throw new AdminError("Ce compte ne possède pas d’adresse e-mail.", 400);
  const client = await createSessionClient(true);
  const { error: authError } = await client.auth.signInWithPassword({ email: user.email, password: input.currentPassword });
  if (authError) throw new AdminError("Le mot de passe actuel est incorrect.", 401);
  const { error } = await client.auth.updateUser({ password: input.password });
  if (error) {
    if (error.code === "same_password" || error.code === "weak_password") {
      throw new AdminError("Choisissez un nouveau mot de passe suffisamment robuste.", 400);
    }
    throw error;
  }
  const { error: auditError } = await db.from("audit_logs").insert({
    actor_id: user.id, action: "admin.password_changed", entity_type: "admin_user", entity_id: user.id,
  });
  if (auditError) {
    console.error("Journalisation du changement de mot de passe impossible :", auditError);
    throw new AdminError("Mot de passe modifié, mais journalisation impossible. Ne réutilisez pas l’ancien mot de passe.", 503);
  }
  return NextResponse.json({ ok: true });
});
