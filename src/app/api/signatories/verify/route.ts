import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { hashOtp, safeEqual } from "@/lib/signing/security";
const schema = z.object({ id: z.string().uuid(), code: z.string().regex(/^\d{6}$/) });
export const runtime = "nodejs";
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Code invalide." }, { status: 400 });
  try {
    const db = createSupabaseAdmin();
    const { data: sig, error } = await db.from("signatures").select("id,otp_hash,otp_expires_at,otp_attempts,status,signatory:signatories(email)").eq("signatory_id", parsed.data.id).single();
    if (error || !sig || sig.status !== "otp_pending") return NextResponse.json({ error: "Demande introuvable ou déjà validée." }, { status: 404 });
    if (new Date(sig.otp_expires_at).getTime() < Date.now() || sig.otp_attempts >= 5) return NextResponse.json({ error: "Code expiré ou nombre maximal de tentatives atteint. Recommencez la demande." }, { status: 410 });
    const signer = Array.isArray(sig.signatory) ? sig.signatory[0] : sig.signatory;
    const matches = safeEqual(hashOtp(parsed.data.code, signer.email), sig.otp_hash);
    if (!matches) { await db.from("signatures").update({ otp_attempts: sig.otp_attempts + 1 }).eq("id", sig.id); return NextResponse.json({ error: "Code incorrect." }, { status: 400 }); }
    const { error: updateError } = await db.from("signatures").update({ status: "verified", email_verified_at: new Date().toISOString(), otp_hash: null, otp_expires_at: null }).eq("id", sig.id).select("id").single();
    if (updateError) throw new Error("La demande n’est plus disponible. Recommencez votre demande.", { cause: updateError });
    await db.from("audit_logs").insert({ action: "signature.email_verified", entity_type: "signatory", entity_id: parsed.data.id });
    return NextResponse.json({ verified: true });
  } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "Erreur serveur" }, { status: 503 }); }
}
