import { adminRoute } from "@/lib/admin/http";
import { csvRow } from "@/lib/admin/csv";

export const GET = adminRoute(async (_request, { db, user }) => {
  const lines = ["\ufeff" + csvRow(["Structure","Type","Représentant","Fonction","E-mail","Statut","Publiée","Date"])];
  let start = 0;
  let total = 0;
  for (;;) {
    const { data, error } = await db.from("signatories").select("organization_name,organization_type,representative_name,representative_role,email,status,published_at,created_at").order("created_at").order("id").range(start, start + 499);
    if (error) throw error;
    for (const item of data) lines.push(csvRow([item.organization_name,item.organization_type,item.representative_name,item.representative_role,item.email,item.status,item.published_at ? "Oui" : "Non",item.created_at]));
    total += data.length;
    if (data.length < 500) break;
    start += 500;
  }
  const { error } = await db.from("audit_logs").insert({ actor_id: user.id, action: "signatories.exported", entity_type: "signatory", metadata: { count: total } });
  if (error) throw error;
  return new Response(lines.join(""), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="registre-signataires.csv"' } });
});
