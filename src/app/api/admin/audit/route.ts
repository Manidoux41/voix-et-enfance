import { NextResponse } from "next/server";
import { adminRoute, pagination } from "@/lib/admin/http";
export const GET = adminRoute(async (request, { db }) => {
  const { page, start, end } = pagination(request);
  const { data, error, count } = await db.from("audit_logs").select("id,actor_id,action,entity_type,entity_id,metadata,created_at", { count: "exact" }).order("created_at", { ascending: false }).order("id").range(start, end);
  if (error) throw error;
  return NextResponse.json({ items: data, count, page });
});
