import Link from "next/link";
import { SignatoryForm } from "@/components/signatory-form";

export default function SignerPage() {
  return (
    <>
      <section className="page-top">
        <div className="container">
          <h1>Soutenir la proposition</h1>
          <p>
            Cette démarche est réservée aux représentants habilités
            d&apos;associations, collectifs et organisations.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container content-grid">
          <div className="panel">
            <h2>Informations de la structure</h2>
            <p className="muted">
              Complétez les informations ci-dessous. Les champs marqués d&apos;un
              astérisque sont obligatoires.
            </p>
            <SignatoryForm />
          </div>

          <aside className="panel">
            <h2>Avant de signer</h2>
            <div className="steps">
              <div className="step">
                <b className="step-number">1</b>
                <div>
                  <strong>Lire le texte</strong>
                  <span>Consultez les cinq pages de la proposition.</span>
                </div>
              </div>

              <div className="step">
                <b className="step-number">2</b>
                <div>
                  <strong>Représenter la structure</strong>
                  <span>Vous devez être habilité à exprimer son soutien.</span>
                </div>
              </div>

              <div className="step">
                <b className="step-number">3</b>
                <div>
                  <strong>Confirmer le soutien</strong>
                  <span>Vous vérifierez votre adresse e-mail puis signerez le document dans un espace sécurisé.</span>
                </div>
              </div>
            </div>

            <div className="notice" style={{ marginTop: 22 }}>
              Le parcours comprend une vérification de l’adresse e-mail, un consentement explicite et une signature manuscrite électronique associée à la version exacte du document. Il s’agit d’un procédé de signature électronique simple : aucune qualification eIDAS n’est revendiquée.
            </div>

            <p className="muted" style={{ marginTop: 18 }}>
              Vous n&apos;avez pas encore consulté le PDF ?{" "}
              <Link
                href="/proposition"
                style={{
                  color: "var(--navy)",
                  fontWeight: 700,
                  textDecoration: "underline",
                }}
              >
                Lire la proposition
              </Link>
              .
            </p>
          </aside>
        </div>
      </section>
    </>
  );
}
