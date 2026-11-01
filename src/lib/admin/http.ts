import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AdminError, requireAdmin, requireSameOrigin } from "./auth";

type Context = Awaited<ReturnType<typeof requireAdmin>>;

export function adminRoute(handler: (request: Request, context: Context) => Promise<Response>) {
  return async (request: Request) => {
    try {
      if (request.method !== "GET") requireSameOrigin(request);
      const context = await requireAdmin(true);
      const response = await handler(request, context);
      response.headers.set("Cache-Control", "private, no-store");
      return response;
    } catch (error) {
      const status = error instanceof AdminError ? error.status : error instanceof ZodError || error instanceof SyntaxError ? 400 : 503;
      if (status === 503) console.error("Opération administrative impossible :", error);
      return NextResponse.json({
        error: error instanceof AdminError ? error.message : status === 400 ? "Données invalides." : "Opération impossible. Consultez les journaux serveur.",
      }, { status, headers: { "Cache-Control": "private, no-store" } });
    }
  };
}

export function pagination(request: Request) {
  const value = new URL(request.url).searchParams.get("page") ?? "1";
  if (!/^[1-9]\d{0,5}$/.test(value)) throw new AdminError("Page invalide.", 400);
  const page = Number(value);
  return { page, start: (page - 1) * 25, end: page * 25 - 1 };
}
