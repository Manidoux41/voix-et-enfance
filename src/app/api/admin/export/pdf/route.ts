import { z } from "zod";
import { adminRoute } from "@/lib/admin/http";
import { AdminError } from "@/lib/admin/auth";
import { buildRegistryPdf, type RegistryRow } from "@/lib/admin/registry-pdf";
import { sha256 } from "@/lib/signing/security";

export const runtime = "nodejs";
export const GET = adminRoute(async (request, { db, user }) => {
  const params = new URL(request.url).searchParams;
  const { format, documentId } = z.object({
    format: z.enum(["registry", "appendix"]).default("registry"),
    documentId: z.string().uuid().optional(),
  }).parse({ format: params.get("format") ?? undefined, documentId: params.get("documentId") ?? undefined });
  if (format === "appendix" && !documentId) throw new AdminError("Sélectionnez la version du document à exporter.", 400);
  let source: Uint8Array | undefined;
  if (format === "appendix") {
    const { data: document, error } = await db.from("documents").select("original_file_path,sha256_hash").eq("id", documentId).single();
    if (error) throw error;
    const { data: file, error: downloadError } = await db.storage.from("signing-documents").download(document.original_file_path);
    if (downloadError) throw downloadError;
    source = new Uint8Array(await file.arrayBuffer());
    if (sha256(Buffer.from(source)) !== document.sha256_hash) throw new AdminError("L’empreinte du PDF source ne correspond pas à la version enregistrée.", 409);
  }
  const rows: RegistryRow[] = [];
  for (let start = 0;; start += 500) {
    let query = db.from("signatures").select("id,signed_at,signatory:signatories!inner(organization_name,organization_type,representative_name,representative_role),document:documents!inner(title,version)")
      .eq("status", "signed").not("email_verified_at", "is", null).not("signed_at", "is", null)
      .not("signed_pdf_path", "is", null).not("signed_pdf_hash", "is", null)
      .order("signed_at").order("id").range(start, start + 499);
    if (documentId) query = query.eq("document_id", documentId);
    const { data, error } = await query;
    if (error) throw error;
    for (const entry of data) {
      const signer = Array.isArray(entry.signatory) ? entry.signatory[0] : entry.signatory;
      const document = Array.isArray(entry.document) ? entry.document[0] : entry.document;
      if (!signer || !document || !entry.signed_at) throw new Error("Signature incomplète dans le registre.");
      rows.push({ structure: signer.organization_name, type: signer.organization_type,
        representative: signer.representative_name, role: signer.representative_role,
        signedAt: entry.signed_at, version: `${document.title} - ${document.version}` });
    }
    if (data.length < 500) break;
  }
  const { bytes, registryPages } = await buildRegistryPdf(rows, source);
  const { error } = await db.from("audit_logs").insert({
    actor_id: user.id, action: "signatures.pdf_exported", entity_type: "signature",
    metadata: { format, document_id: documentId ?? null, count: rows.length, registry_pages: registryPages },
  });
  if (error) throw error;
  return new Response(Buffer.from(bytes), { headers: {
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename="${format === "appendix" ? "proposition-avec-signataires" : "registre-signatures"}.pdf"`,
  } });
});
