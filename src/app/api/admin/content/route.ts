import { NextResponse } from "next/server";
import { z } from "zod";
import { adminRoute } from "@/lib/admin/http";
import { AdminError } from "@/lib/admin/auth";
import { contentDefaults, type ContentPage } from "@/lib/content-fields";

export const GET = adminRoute(async (_request, { db }) => {
  const { data, error } = await db.from("site_content").select("page,content,revision");
  if (error) throw error;
  return NextResponse.json({ items: (Object.keys(contentDefaults) as ContentPage[]).map(page => {
    const saved = data.find(item => item.page === page);
    return { page, fields: { ...contentDefaults[page], ...saved?.content }, revision: saved?.revision ?? 0 };
  }) });
});
export const PUT = adminRoute(async (request, { db, user }) => {
  const input = z.object({
    page: z.enum(["home","proposition","signer","signataires","legal"]),
    fields: z.record(z.string().trim().min(1).max(10000)),
    revision: z.number().int().nonnegative(),
  }).parse(await request.json());
  const allowed = Object.keys(contentDefaults[input.page]);
  if (Object.keys(input.fields).length !== allowed.length || allowed.some(key => !(key in input.fields))) throw new AdminError("Champs de contenu invalides.", 400);
  const { data, error } = await db.rpc("save_site_content", { actor: user.id, target_page: input.page, fields: input.fields, expected_revision: input.revision });
  if (error) {
    if (error.code === "P0001") throw new AdminError(error.message, 409);
    throw error;
  }
  return NextResponse.json({ revision: data });
});
