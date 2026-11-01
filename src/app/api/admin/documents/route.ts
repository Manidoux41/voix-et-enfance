import { NextResponse } from "next/server";
import { z } from "zod";
import { PDFDocument } from "pdf-lib";
import { randomUUID } from "node:crypto";
import { adminRoute, pagination } from "@/lib/admin/http";
import { AdminError } from "@/lib/admin/auth";
import { sha256 } from "@/lib/signing/security";
export const runtime = "nodejs";

export const GET = adminRoute(async (request, { db }) => {
  const { page, start, end } = pagination(request);
  const { data, error, count } = await db.from("documents").select("id,title,version,original_file_path,sha256_hash,is_active,created_at", { count: "exact" }).order("created_at", { ascending: false }).order("id").range(start, end);
  if (error) throw error;
  return NextResponse.json({ items: data, count, page });
});
export const POST = adminRoute(async (request, { db, user }) => {
  if (Number(request.headers.get("content-length") ?? 0) > 4_000_000) throw new AdminError("PDF trop volumineux (3 Mo maximum).", 413);
  const form = await request.formData();
  const input = z.object({ title: z.string().trim().min(2).max(200), version: z.string().trim().min(1).max(40) }).parse({ title: form.get("title"), version: form.get("version") });
  const file = form.get("file");
  if (!(file instanceof File) || file.size < 5 || file.size > 3_000_000) throw new AdminError("Choisissez un PDF de moins de 3 Mo.", 400);
  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.subarray(0, 5).toString() !== "%PDF-") throw new AdminError("Le fichier doit être un PDF.", 400);
  try { await PDFDocument.load(bytes); }
  catch (error) {
    console.error("Validation du PDF téléversé refusée :", error instanceof Error ? error.message : "PDF invalide");
    throw new AdminError("PDF illisible ou chiffré. Choisissez un PDF non protégé.", 400);
  }
  const id = randomUUID();
  const hash = sha256(bytes);
  const path = `original/${id}.pdf`;
  const { error: uploadError } = await db.storage.from("signing-documents").upload(path, bytes, { contentType: "application/pdf", upsert: false });
  if (uploadError) throw uploadError;
  const { error } = await db.rpc("register_site_document", { actor: user.id, target: id, doc_title: input.title, doc_version: input.version, file_path: path, file_hash: hash });
  if (error) {
    const { error: cleanupError } = await db.storage.from("signing-documents").remove([path]);
    if (cleanupError) console.error("Nettoyage du PDF non enregistré impossible :", cleanupError);
    throw error;
  }
  return NextResponse.json({ id }, { status: 201 });
});
export const PATCH = adminRoute(async (request, { db, user }) => {
  const { id } = z.object({ id: z.string().uuid() }).parse(await request.json());
  const { data: doc, error: docError } = await db.from("documents").select("original_file_path,sha256_hash").eq("id", id).maybeSingle();
  if (docError) throw docError;
  if (!doc) throw new AdminError("Document introuvable.", 404);
  const { data, error: storageError } = await db.storage.from("signing-documents").download(doc.original_file_path);
  if (storageError) throw storageError;
  if (sha256(Buffer.from(await data.arrayBuffer())) !== doc.sha256_hash) throw new AdminError("Empreinte du PDF invalide : activation refusée.", 409);
  const { error } = await db.rpc("activate_site_document", { actor: user.id, target: id });
  if (error) {
    if (error.code === "P0001") throw new AdminError(error.message, 409);
    throw error;
  }
  return NextResponse.json({ ok: true });
});
