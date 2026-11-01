import { NextResponse } from "next/server";
import { z } from "zod";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { sha256 } from "@/lib/signing/security";
const schema = z.object({ id: z.string().uuid(), signatureDataUrl: z.string().regex(/^data:image\/png;base64,/).max(1_500_000), consent: z.literal(true) });
export const runtime = "nodejs";
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Signature ou consentement invalide." }, { status: 400 });
  try {
    const db = createSupabaseAdmin();
    const { data: sig, error } = await db.from("signatures").select("id,status,document_id,document_hash,signatory:signatories(*)").eq("signatory_id", parsed.data.id).single();
    if (error || !sig || sig.status !== "verified") return NextResponse.json({ error: "L'adresse e-mail doit être vérifiée avant la signature." }, { status: 409 });
    const signer = Array.isArray(sig.signatory) ? sig.signatory[0] : sig.signatory;
    const { data: doc, error: docError } = await db.from("documents").select("*").eq("id", sig.document_id).single();
    if (docError || !doc || doc.sha256_hash !== sig.document_hash) return NextResponse.json({ error: "La version du document a changé. La signature est interrompue." }, { status: 409 });
    const { data: original, error: downloadError } = await db.storage.from("signing-documents").download(doc.original_file_path);
    if (downloadError || !original) throw new Error("Impossible de récupérer le PDF original dans le stockage signing-documents.");
    const pdfBytes = Buffer.from(await original.arrayBuffer());
    if (sha256(pdfBytes) !== doc.sha256_hash) throw new Error("L'empreinte du PDF source ne correspond plus à la version publiée.");
    const pdf = await PDFDocument.load(pdfBytes);
    const page = pdf.addPage(); const font = await pdf.embedFont(StandardFonts.Helvetica); const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const png = Buffer.from(parsed.data.signatureDataUrl.split(",")[1], "base64");
    const image = await pdf.embedPng(png);
    const margin = 48; let y = page.getHeight() - margin;
    page.drawText("ATTESTATION DE SIGNATURE ELECTRONIQUE", { x: margin, y, size: 14, font: bold }); y -= 34;
    const lines = [
      `Document : ${doc.title} - version ${doc.version}`,
      `Structure : ${signer.organization_name}`,
      `Representant : ${signer.representative_name} (${signer.representative_role})`,
      `Adresse e-mail verifiee : ${signer.email}`,
      `Date et heure UTC : ${new Date().toISOString()}`,
      `Empreinte SHA-256 du document source : ${doc.sha256_hash}`,
      `Consentement : signature electronique et soutien de la structure confirmes.`,
      `Methode : code a usage unique envoye par e-mail puis signature manuscrite sur interface.`,
      `Niveau : signature electronique simple ; aucune qualification eIDAS n'est revendiquee.`
    ];
    for (const line of lines) { page.drawText(line.slice(0, 110), { x: margin, y, size: 9, font, color: rgb(0.12,0.16,0.22) }); y -= 18; }
    y -= 10; page.drawText("Signature recueillie", { x: margin, y, size: 10, font: bold });
    page.drawImage(image, { x: margin, y: y - 105, width: Math.min(260, image.width), height: Math.min(100, image.height * Math.min(260 / image.width, 100 / image.height)) });
    const signedBytes = Buffer.from(await pdf.save()); const signedHash = sha256(signedBytes);
    const path = `${parsed.data.id}/${sig.id}-${signedHash.slice(0,16)}.pdf`;
    const { error: uploadError } = await db.storage.from("signed-documents").upload(path, signedBytes, { contentType: "application/pdf", upsert: false });
    if (uploadError) throw uploadError;
    const now = new Date().toISOString();
    const { error: updateError } = await db.from("signatures").update({ status: "signed", signed_at: now, signed_pdf_path: path, signed_pdf_hash: signedHash, signature_image_hash: sha256(png), consent_text: "Je confirme signer au nom de la structure indiquée, après lecture du document, et autorise la publication de son nom parmi les soutiens.", ip_address: request.headers.get("x-forwarded-for")?.split(",")[0] ?? null, user_agent: request.headers.get("user-agent") ?? null }).eq("id", sig.id).select("id").single();
    if (updateError) throw updateError;
    await db.from("signatories").update({ status: "signed" }).eq("id", parsed.data.id);
    await db.from("audit_logs").insert({ action: "signature.completed", entity_type: "signatory", entity_id: parsed.data.id, metadata: { signature_id: sig.id, document_hash: doc.sha256_hash, signed_pdf_hash: signedHash, signed_at: now } });
    return NextResponse.json({ signed: true, signedAt: now, hash: signedHash });
  } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "Erreur lors de la signature" }, { status: 503 }); }
}
