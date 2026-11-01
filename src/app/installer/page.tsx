import { WebAppInstall } from "@/components/web-app-install";

export const metadata = {
  title: "Installer l’application — Voix & Enfance",
  description: "Installer Voix & Enfance sur votre mobile et partager le lien d’installation par QR code.",
};

export default function InstallPage() {
  return <>
    <section className="page-top"><div className="container">
      <h1>Voix &amp; Enfance sur votre mobile</h1>
      <p>Ajoutez gratuitement la webapp à votre écran d’accueil, sans boutique d’applications.</p>
    </div></section>
    <section className="section"><div className="container"><WebAppInstall /></div></section>
  </>;
}
