import { NextResponse } from "next/server";
import { z } from "zod";
import { adminRoute, pagination } from "@/lib/admin/http";
import { AdminError } from "@/lib/admin/auth";

export const GET = adminRoute(async (request, { db }) => {
  const { page, start, end } = pagination(request);
  const { data, count, error } = await db.from("admin_users").select("user_id,role,created_at", { count: "exact" }).order("created_at").order("id").range(start, end);
  if (error) throw error;
  const items = await Promise.all(data.map(async entry => {
    const { data: auth, error } = await db.auth.admin.getUserById(entry.user_id);
    if (error) throw error;
    return { ...entry, email: auth.user.email ?? "(compte sans e-mail)" };
  }));
  return NextResponse.json({ items, count, page });
});
export const POST = adminRoute(async (request, { db, user }) => {
  const input = z.object({ userId: z.string().uuid(), role: z.enum(["admin","reviewer"]).nullable() }).parse(await request.json());
  if (input.role !== null) {
    const { data, error } = await db.auth.admin.getUserById(input.userId);
    if (error || !data.user) throw new AdminError("Créez d’abord ce compte dans Supabase Authentication.", 400);
    if (!data.user.email_confirmed_at) throw new AdminError("L’adresse e-mail du compte doit être confirmée.", 400);
  }
  const { error } = await db.rpc("set_site_admin", { actor: user.id, target: input.userId, access_role: input.role });
  if (error) {
    if (error.code === "P0001") throw new AdminError(error.message, 409);
    throw error;
  }
  return NextResponse.json({ ok: true });
});
