import { NextResponse } from "next/server";
import { z } from "zod";
import { AdminError, createSessionClient, requireAdmin, requireSameOrigin } from "@/lib/admin/auth";

async function session(request: Request) {
  try {
    requireSameOrigin(request);
    const client = await createSessionClient(true);
    if (request.method === "DELETE") {
      const { error } = await client.auth.signOut();
      if (error) throw error;
      return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
    }
    const credentials = z.object({ email: z.string().email().max(254), password: z.string().min(1).max(256) }).parse(await request.json());
    const { error } = await client.auth.signInWithPassword(credentials);
    if (error) throw new AdminError("Connexion refusée. Vérifiez vos identifiants et votre autorisation.", 401);
    try {
      await requireAdmin(true);
    } catch (error) {
      const { error: logoutError } = await client.auth.signOut();
      if (logoutError) console.error("Fermeture de session refusée :", logoutError);
      throw error;
    }
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (!(error instanceof AdminError) && !(error instanceof z.ZodError) && !(error instanceof SyntaxError)) console.error("Erreur de session administrateur :", error);
    return NextResponse.json({ error: error instanceof AdminError ? error.message : error instanceof z.ZodError || error instanceof SyntaxError ? "Identifiants invalides." : "Authentification indisponible." }, {
      status: error instanceof AdminError ? error.status : error instanceof z.ZodError || error instanceof SyntaxError ? 400 : 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
export const POST = session;
export const DELETE = session;
