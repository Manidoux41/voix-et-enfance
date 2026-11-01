import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { sha256 } from "@/lib/signing/security";
import { AdminError, requireAdmin } from "@/lib/admin/auth";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const parsed = z.string().uuid().safeParse(new URL(request.url).searchParams.get("id"));
  if (!parsed.success) return NextResponse.json({ error: "Document invalide." }, { status: 400 });
  try {
    const db = createSupabaseAdmin();
    const { data: doc, error } = await db.from("documents").select("original_file_path,sha256_hash,is_public,is_active").eq("id", parsed.data).maybeSingle();
    if (error) throw error;
    if (!doc) return NextResponse.json({ error: "Document introuvable." }, { status: 404 });
    if (!doc.is_public && !doc.is_active) await requireAdmin(true);
    const { data, error: downloadError } = await db.storage.from("signing-documents").download(doc.original_file_path);
    if (downloadError) throw downloadError;
    const bytes = await data.arrayBuffer();
    if (sha256(Buffer.from(bytes)) !== doc.sha256_hash) throw new Error("Empreinte du document invalide.");
    return new Response(bytes, { headers: { "Content-Type": "application/pdf", "Content-Disposition": 'inline; filename="proposition.pdf"', "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
  } catch (error) {
    if (error instanceof AdminError) return NextResponse.json({ error: error.message }, { status: error.status, headers: { "Cache-Control": "no-store" } });
    console.error("Lecture du document public impossible :", error);
    return NextResponse.json({ error: "Document indisponible." }, { status: 503 });
  }
}
