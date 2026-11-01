import Link from "next/link";
import { getSiteContent } from "@/lib/site-content";
import { createSupabaseAdmin } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";

export default async function SignatoriesPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const params = await searchParams;
  const content = await getSiteContent("signataires");
  if (params.page && !/^[1-9]\d{0,5}$/.test(params.page)) return <section className="section"><div className="container notice">Page invalide. <Link href="/signataires">Revenir au registre</Link></div></section>;
  const page = Number(params.page ?? 1);
  let items: { organization_name: string; organization_type: string }[] = [];
  let count = 0;
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const { data, error, count: total } = await createSupabaseAdmin().from("published_structures").select("organization_name,organization_type", { count: "exact" }).order("published_at", { ascending: false }).order("id").range((page - 1) * 50, page * 50 - 1);
    if (error) throw new Error("Impossible de charger le registre public.", { cause: error });
    items = data; count = total ?? 0;
  }
  return <>
    <section className="page-top"><div className="container"><h1>{content.title}</h1><p>{content.introduction}</p></div></section>
    <section className="section"><div className="container panel">
      <h2>{content.registerTitle}</h2>
      <p className="muted">{count} structure(s) publiée(s). Seuls le nom et le type des structures sont affichés.</p>
      {!items.length ? <p className="notice">Aucune structure publiée sur cette page.</p> : <div className="cards">{items.map((item, index) => <article className="card" key={index}><h3>{item.organization_name}</h3><p>{item.organization_type}</p></article>)}</div>}
      <div className="admin-actions admin-section">
        {page > 1 && <Link className="btn btn-outline" href={`/signataires?page=${page - 1}`}>Précédente</Link>}
        {page * 50 < count && <Link className="btn btn-outline" href={`/signataires?page=${page + 1}`}>Suivante</Link>}
      </div>
    </div></section>
  </>;
}
