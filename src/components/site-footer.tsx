import Link from "next/link";
export function SiteFooter() {
  return <footer className="footer"><div className="container footer-inner">
    <div><strong>VOIX & ENFANCE</strong><br/><small>Une initiative collective pour les droits de l&apos;enfant.</small></div>
    <div><small><Link href="/proposition">Consulter le texte</Link> · <Link href="/signer">Signer</Link> · <Link href="/installer">Installer l’application</Link> · <Link href="/mentions-legales">Informations légales</Link></small></div>
    <small>Prototype de collecte — les signatures ne sont pas activées en production.</small>
  </div></footer>;
}
