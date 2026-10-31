import Link from "next/link";
import { Download, ExternalLink, FileText } from "lucide-react";

const pdf = "/documents/proposition-loi-protection-enfance.pdf";

export default function PropositionPage() {
  return (
    <>
      <section className="page-top">
        <div className="container">
          <h1>La proposition de loi</h1>
          <p>
            Consultez le document intégral avant de décider si votre structure
            souhaite soutenir cette initiative.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="pdf-toolbar">
            <div>
              <strong style={{ color: "var(--navy)" }}>
                Proposition de loi visant à clarifier les critères du danger
                justifiant une mesure d&apos;assistance éducative
              </strong>
              <div className="muted">Document de référence · 5 pages</div>
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
            <strong>Important :</strong> prenez le temps de lire les cinq pages.
            Le formulaire de soutien vous demandera de confirmer que vous avez
            pris connaissance de cette version du texte.
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
