import "server-only";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { contentDefaults, type ContentPage } from "./content-fields";

export async function getSiteContent<T extends ContentPage>(page: T): Promise<(typeof contentDefaults)[T]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return contentDefaults[page];
  const { data, error } = await createSupabaseAdmin().from("site_content").select("content").eq("page", page).maybeSingle();
  if (error) throw new Error("Impossible de charger le contenu du site. Vérifiez la migration 003.", { cause: error });
  const defaults = contentDefaults[page];
  const fields: Record<string, string> = {};
  for (const key of Object.keys(defaults)) {
    const value: unknown = data?.content?.[key];
    if (typeof value === "string") fields[key] = value;
  }
  return { ...defaults, ...fields };
}
