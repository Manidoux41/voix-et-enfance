import { NextResponse } from "next/server";
import { z } from "zod";
import { adminRoute } from "@/lib/admin/http";
import { AdminError } from "@/lib/admin/auth";

export const POST = adminRoute(async (request, { db, user }) => {
  const { id } = z.object({ id: z.string().uuid() }).parse(await request.json());
  const { data, error } = await db.from("signatures").select("signed_pdf_path,status").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data?.signed_pdf_path || data.status !== "signed") throw new AdminError("PDF signé introuvable.", 404);
  const { data: link, error: linkError } = await db.storage.from("signed-documents").createSignedUrl(data.signed_pdf_path, 60, { download: true });
  if (linkError) throw linkError;
  const { error: auditError } = await db.from("audit_logs").insert({ actor_id: user.id, action: "signature.download_link_created", entity_type: "signature", entity_id: id });
  if (auditError) throw auditError;
  return NextResponse.json({ url: link.signedUrl, expiresIn: 60 });
});
