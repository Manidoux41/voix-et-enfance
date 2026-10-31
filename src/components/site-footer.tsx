import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div>
          <strong>VOIX &amp; ENFANCE</strong>
          <br />
          <small>
            Une initiative collective pour les droits de l&apos;enfant.
          </small>
        </div>

        <div>
          <small>
            <Link href="/proposition">Consulter le texte</Link>
            {" · "}
            <Link href="/signer">Soutenir</Link>
            {" · "}
            <Link href="/mentions-legales">Informations légales</Link>
          </small>
        </div>

        <small>
          Prototype de collecte — les signatures ne sont pas activées en production.
        </small>
      </div>
    </footer>
  );
}