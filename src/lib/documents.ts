import "server-only";
import { createSupabaseAdmin } from "@/lib/supabase/server";
export async function getActiveDocument() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  const { data, error } = await createSupabaseAdmin().from("documents").select("id,title,version,sha256_hash").eq("is_active", true).maybeSingle();
  if (error) throw new Error("Impossible de charger le document actif.", { cause: error });
  return data;
}
