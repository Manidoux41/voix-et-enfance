import { NextResponse } from "next/server";
import { signatorySchema } from "@/lib/validators/signatory";
import { createSupabaseAdmin } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const parsed = signatorySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Données invalides", details: parsed.error.flatten() }, { status: 400 });

  try {
    const supabase = createSupabaseAdmin();
    const { data, error } = await supabase.from("signatories").insert({
      organization_name: parsed.data.organizationName,
      organization_type: parsed.data.organizationType,
      representative_name: parsed.data.representativeName,
      representative_role: parsed.data.representativeRole,
      email: parsed.data.email,
      phone: parsed.data.phone,
      address: parsed.data.address,
      website: parsed.data.website,
      reading_confirmed_at: new Date().toISOString(),
      authority_confirmed_at: new Date().toISOString(),
      support_confirmed_at: new Date().toISOString(),
      status: "submitted"
    }).select("id").single();
    if (error) throw error;
    return NextResponse.json({ id: data.id, status: "submitted" }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erreur serveur" }, { status: 503 });
  }
}
