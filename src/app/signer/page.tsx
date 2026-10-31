import { SignatoryForm } from "@/components/signatory-form";
import Link from "next/link";
export default function SignerPage() {
  return <>
    <section className="page-top"><div className="container"><h1>Soutenir la proposition</h1><p>Cette démarche est réservée aux représentants habilités d'associations, collectifs et organisations.</p></div></section>
    <section className="section"><div className="container content-grid">
      <div className="panel"><h2>Informations de la structure</h2><p className="muted">Complétez les informations ci-dessous. Les champs marqués d'un astérisque sont obligatoires.</p><SignatoryForm/></div>
      <aside className="panel"><h2>Avant de signer</h2><div className="steps">
        <div className="step"><b className="step-number">1</b><div><strong>Lire le texte</strong><span>Consultez les cinq pages de la proposition.</span></div></div>
        <div className="step"><b className="step-number">2</b><div><strong>Représenter la structure</strong><span>Vous devez être habilité à exprimer son soutien.</span></div></div>
        <div className="step"><b className="step-number">3</b><div><strong>Confirmer le soutien</strong><span>Une demande individuelle de signature sera préparée.</span></div></div>
      </div><div className="notice" style={{marginTop:22}}>Le connecteur OpenSign n'est pas encore configuré. Cette version de démonstration enregistre une demande locale, mais ne réalise pas de signature électronique.</div><p className="muted" style={{marginTop:18}}>Vous n'avez pas encore consulté le PDF ? <Link href="/proposition" style={{color:"var(--navy)",fontWeight:700,textDecoration:"underline"}}>Lire la proposition</Link>.</p></aside>
    </div></section>
  </>;
}
