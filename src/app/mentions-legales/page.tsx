import { getSiteContent } from "@/lib/site-content";
export const dynamic = "force-dynamic";
export default async function LegalPage() {
  const content = await getSiteContent("legal");
  return <>
    <section className="page-top"><div className="container"><h1>{content.title}</h1><p>{content.introduction}</p></div></section>
    <section className="section"><div className="container panel">
      <h2>{content.privacyTitle}</h2><p className="muted public-copy">{content.privacyText}</p>
      <h2 style={{ marginTop: 24 }}>{content.publisherTitle}</h2><p className="muted public-copy">{content.publisherText}</p>
    </div></section>
  </>;
}
