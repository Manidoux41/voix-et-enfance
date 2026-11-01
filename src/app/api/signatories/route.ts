import { NextResponse } from "next/server";
import { signatorySchema } from "@/lib/validators/signatory";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { createOtp, hashOtp } from "@/lib/signing/security";
import { sendOtpEmail } from "@/lib/signing/email";

export const runtime = "nodejs";
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = signatorySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Données invalides", details: parsed.error.flatten() }, { status: 400 });
  try {
    const supabase = createSupabaseAdmin();
    const { data: document, error: docError } = await supabase.from("documents").select("id,title,version,sha256_hash").eq("is_active", true).single();
    if (docError || !document) return NextResponse.json({ error: "Aucun document de signature actif n'est publié." }, { status: 409 });
    const now = new Date().toISOString(); const code = createOtp();
    const { data, error } = await supabase.from("signatories").insert({
      organization_name: parsed.data.organizationName, organization_type: parsed.data.organizationType,
      representative_name: parsed.data.representativeName, representative_role: parsed.data.representativeRole,
      email: parsed.data.email.toLowerCase(), phone: parsed.data.phone, address: parsed.data.address, website: parsed.data.website,
      reading_confirmed_at: now, authority_confirmed_at: now, support_confirmed_at: now, status: "pending_signature"
    }).select("id").single();
    if (error) throw error;
    const otpHash = hashOtp(code, parsed.data.email);
    const { error: sigError } = await supabase.from("signatures").insert({
      signatory_id: data.id, status: "otp_pending", document_id: document.id, document_hash: document.sha256_hash,
      otp_hash: otpHash, otp_expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), otp_attempts: 0,
      consent_version: "consent-signature-v1"
    });
    if (sigError) throw sigError;
    await sendOtpEmail(parsed.data.email, code, parsed.data.organizationName);
    await supabase.from("audit_logs").insert({ action: "signature.requested", entity_type: "signatory", entity_id: data.id, metadata: { document_id: document.id, document_hash: document.sha256_hash } });
    return NextResponse.json({ id: data.id, status: "otp_sent" }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erreur serveur" }, { status: 503 });
  }
}
