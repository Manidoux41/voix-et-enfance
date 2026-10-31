import Link from "next/link";
import { FileText, Users, ShieldCheck, Landmark, ArrowRight, BookOpen } from "lucide-react";

export default function HomePage() {
  return <>
    <section className="hero"><div className="container hero-grid">
      <div><div className="eyebrow">Initiative interassociative · Protection de l'enfance</div>
        <h1>Faire entendre une voix commune pour l'enfance.</h1>
        <p>Une proposition de loi portée collectivement pour clarifier les critères du danger justifiant une mesure d'assistance éducative, renforcer le contrôle indépendant et améliorer le pilotage national de la protection de l'enfance.</p>
        <div className="hero-actions"><Link href="/proposition" className="btn btn-outline"><BookOpen size={17}/> Lire la proposition</Link><Link href="/signer" className="btn btn-primary">Soutenir l'initiative <ArrowRight size={17}/></Link></div>
      </div>
      <div className="hero-card"><h3>Une démarche collective</h3><p>Les associations et collectifs peuvent prendre connaissance du texte puis exprimer le soutien de leur structure.</p>
        <div className="hero-stat"><FileText color="#213d5e"/><div><strong>Un texte commun</strong><span>Une proposition structurée en cinq articles</span></div></div>
        <div className="hero-stat"><Users color="#213d5e"/><div><strong>Une mobilisation associative</strong><span>Chaque structure signe en son nom</span></div></div>
        <div className="hero-stat"><ShieldCheck color="#213d5e"/><div><strong>Une démarche transparente</strong><span>Consultation du document avant soutien</span></div></div>
      </div>
    </div></section>
    <section className="section"><div className="container"><div className="section-heading"><h2>Les objectifs de l'initiative</h2><p>Le texte soumis à la signature des associations, collectifs et organisations engagés dans la protection des enfants et le respect des droits des familles s'articule autour de trois axes.</p></div>
      <div className="cards">
        <article className="card"><div className="card-icon"><FileText/></div><h3>Clarifier la notion de danger</h3><p>Préciser les critères d'appréciation du danger à partir d'éléments précis, objectifs, circonstanciés et actualisés.</p></article>
        <article className="card"><div className="card-icon"><ShieldCheck/></div><h3>Instaurer un contrôle indépendant</h3><p>Prévoir un regard national indépendant sur le fonctionnement des services de protection de l'enfance.</p></article>
        <article className="card"><div className="card-icon"><Landmark/></div><h3>Renforcer le pilotage national</h3><p>Améliorer la coordination interministérielle, le suivi des engagements et la transparence des politiques publiques.</p></article>
      </div>
    </div></section>
    <section className="section section-white"><div className="container" style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:24,flexWrap:"wrap"}}>
      <div><h2 style={{color:"var(--navy)",margin:"0 0 8px"}}>Prenez connaissance du texte</h2><p className="muted" style={{margin:0}}>Le PDF complet est consultable avant toute démarche de signature.</p></div>
      <Link href="/proposition" className="btn btn-primary">Consulter le PDF <ArrowRight size={17}/></Link>
    </div></section>
  </>;
}
