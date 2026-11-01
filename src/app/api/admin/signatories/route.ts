import { NextResponse } from "next/server";
import { z } from "zod";
import { adminRoute, pagination } from "@/lib/admin/http";
import { AdminError } from "@/lib/admin/auth";

export const GET = adminRoute(async (request, { db }) => {
  const { page, start, end } = pagination(request);
  const params = new URL(request.url).searchParams;
  const search = z.string().max(200).parse(params.get("search") ?? "").trim();
  const status = z.enum(["all","signed","pending_signature","submitted","rejected","withdrawn","published"]).parse(params.get("status") ?? "all");
  let query = db.from("signatories").select("id,organization_name,organization_type,representative_name,representative_role,email,phone,address,website,status,created_at,published_at,signatures(id,status,signed_at,signed_pdf_path,signed_pdf_hash,email_verified_at)", { count: "exact" });
  if (search) query = query.ilike("organization_name", `%${search.replace(/[\\%_]/g, "\\$&")}%`);
  if (status === "published") query = query.not("published_at", "is", null);
  else if (status !== "all") query = query.eq("status", status);
  const { data, error, count } = await query.order("created_at", { ascending: false }).order("id").range(start, end);
  if (error) throw error;
  const metrics = await Promise.all([
    db.from("signatories").select("id", { head: true, count: "exact" }),
    db.from("signatories").select("id", { head: true, count: "exact" }).eq("status", "signed"),
    db.from("signatories").select("id", { head: true, count: "exact" }).not("published_at", "is", null),
  ]);
  for (const result of metrics) if (result.error) throw result.error;
  return NextResponse.json({ items: data, count, page, metrics: { total: metrics[0].count, signed: metrics[1].count, published: metrics[2].count } });
});

export const PATCH = adminRoute(async (request, { db, user }) => {
  const { id, publish } = z.object({ id: z.string().uuid(), publish: z.boolean() }).parse(await request.json());
  const { error } = await db.rpc("set_signatory_publication", { actor: user.id, target: id, publish });
  if (error) {
    if (error.code === "P0001") throw new AdminError(error.message, 409);
    throw error;
  }
  return NextResponse.json({ ok: true });
});
