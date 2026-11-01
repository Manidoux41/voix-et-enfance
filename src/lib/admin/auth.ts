import "server-only";
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createSupabaseAdmin } from "@/lib/supabase/server";

export class AdminError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
  }
}

export async function createSessionClient(writable = false) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new AdminError("Authentification Supabase non configurée.", 503);
  const store = await cookies();
  return createServerClient(url, key, {
    cookieOptions: { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" },
    cookies: {
      getAll: () => store.getAll(),
      setAll: (entries: { name: string; value: string; options: CookieOptions }[]) => {
        if (writable) entries.forEach(({ name, value, options }) => store.set(name, value, options));
      },
    },
  });
}

export async function requireAdmin(writable = false) {
  const client = await createSessionClient(writable);
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) throw new AdminError("Connexion administrateur requise.", 401);
  const db = createSupabaseAdmin();
  const { data, error: roleError } = await db.from("admin_users").select("role").eq("user_id", user.id).maybeSingle();
  if (roleError) throw new AdminError("Impossible de vérifier les droits administrateur.", 503);
  if (!user.email_confirmed_at || data?.role !== "admin") throw new AdminError("Accès réservé aux administrateurs autorisés.", 403);
  return { user, db };
}

export function adminOrigin() {
  const vercelHost = process.env.VERCEL === "1"
    ? process.env.VERCEL_ENV === "production"
      ? process.env.VERCEL_PROJECT_PRODUCTION_URL
      : process.env.VERCEL_URL
    : undefined;
  const expected = process.env.NEXT_PUBLIC_APP_URL || (vercelHost ? `https://${vercelHost}` : undefined);
  if (!expected) throw new AdminError("NEXT_PUBLIC_APP_URL doit être configurée pour protéger les opérations administratives.", 503);
  let url;
  try { url = new URL(expected); }
  catch { throw new AdminError("NEXT_PUBLIC_APP_URL doit être une URL valide.", 503); }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password
    || (process.env.NODE_ENV === "production" && url.protocol !== "https:")) {
    throw new AdminError("L’URL du site doit utiliser HTTPS en production, sans identifiants.", 503);
  }
  return url.origin;
}

export function requireSameOrigin(request: Request) {
  const expected = adminOrigin();
  if (request.headers.get("origin") !== expected) throw new AdminError("Origine de la requête refusée.", 403);
}
