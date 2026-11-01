import Link from "next/link";
import {
  FileText,
  Users,
  ShieldCheck,
  Landmark,
  ArrowRight,
  BookOpen,
} from "lucide-react";
import { getSiteContent } from "@/lib/site-content";

export const dynamic = "force-dynamic";
export default async function HomePage() {
  const content = await getSiteContent("home");
  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <div className="eyebrow">
              {content.eyebrow}
            </div>
            <h1>{content.title}</h1>
            <p>
              {content.introduction}
            </p>
            <div className="hero-actions">
              <Link href="/proposition" className="btn btn-outline">
                <BookOpen size={17} /> Lire la proposition
              </Link>
              <Link href="/signer" className="btn btn-primary">
                Soutenir l&apos;initiative <ArrowRight size={17} />
              </Link>
            </div>
          </div>

          <div className="hero-card">
            <h3>{content.collectiveTitle}</h3>
            <p>
              {content.collectiveText}
            </p>

            <div className="hero-stat">
              <FileText color="#213d5e" />
              <div>
                <strong>{content.textTitle}</strong>
                <span>{content.textDescription}</span>
              </div>
            </div>

            <div className="hero-stat">
              <Users color="#213d5e" />
              <div>
                <strong>{content.mobilizationTitle}</strong>
                <span>{content.mobilizationDescription}</span>
              </div>
            </div>

            <div className="hero-stat">
              <ShieldCheck color="#213d5e" />
              <div>
                <strong>{content.transparencyTitle}</strong>
                <span>{content.transparencyDescription}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-heading">
            <h2>{content.objectivesTitle}</h2>
            <p>
              {content.objectivesText}
            </p>
          </div>

          <div className="cards">
            <article className="card">
              <div className="card-icon">
                <FileText />
              </div>
              <h3>{content.dangerTitle}</h3>
              <p>
                {content.dangerText}
              </p>
            </article>

            <article className="card">
              <div className="card-icon">
                <ShieldCheck />
              </div>
              <h3>{content.controlTitle}</h3>
              <p>
                {content.controlText}
              </p>
            </article>

            <article className="card">
              <div className="card-icon">
                <Landmark />
              </div>
              <h3>{content.coordinationTitle}</h3>
              <p>
                {content.coordinationText}
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="section section-white">
        <div
          className="container"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 24,
            flexWrap: "wrap",
          }}
        >
          <div>
            <h2 style={{ color: "var(--navy)", margin: "0 0 8px" }}>
              {content.ctaTitle}
            </h2>
            <p className="muted" style={{ margin: 0 }}>
              {content.ctaText}
            </p>
          </div>

          <Link href="/proposition" className="btn btn-primary">
            Consulter le PDF <ArrowRight size={17} />
          </Link>
        </div>
      </section>
    </>
  );
}
