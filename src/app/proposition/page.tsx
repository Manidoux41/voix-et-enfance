import Link from "next/link";
import { Download, ExternalLink, FileText } from "lucide-react";
import { getActiveDocument } from "@/lib/documents";
import { getSiteContent } from "@/lib/site-content";

export const dynamic = "force-dynamic";
export default async function PropositionPage() {
  const [document, content] = await Promise.all([getActiveDocument(), getSiteContent("proposition")]);
  const pdf = document ? `/api/documents/pdf?id=${document.id}` : "/documents/proposition-loi-protection-enfance.pdf";
  return (
    <>
      <section className="page-top">
        <div className="container">
          <h1>{content.title}</h1>
          <p>
            {content.introduction}
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="pdf-toolbar">
            <div>
              <strong style={{ color: "var(--navy)" }}>
                {document?.title ?? "Proposition de loi sur la protection de l'enfance"}
              </strong>
              <div className="muted">{document ? `Document actif · version ${document.version}` : "Document de présentation : aucune version de signature active"}</div>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <a className="btn btn-outline" href={pdf} download>
                <Download size={16} /> Télécharger
              </a>
              <a
                className="btn btn-outline"
                href={pdf}
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink size={16} /> Ouvrir
              </a>
            </div>
          </div>

          <div className="notice" style={{ marginBottom: 16 }}>
            <strong>Important :</strong> {content.notice}
          </div>

          <iframe
            className="pdf-frame"
            src={`${pdf}#toolbar=1&navpanes=0&view=FitH`}
            title="Proposition de loi - PDF"
          />

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginTop: 20,
            }}
          >
            <Link href="/signer" className="btn btn-primary">
              J&apos;ai consulté le document — poursuivre <FileText size={17} />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
