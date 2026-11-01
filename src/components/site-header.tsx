import Link from "next/link";
export function SiteHeader() {
  return <header className="site-header"><div className="container header-inner">
    <Link href="/" className="brand"><span className="brand-mark">V</span><span>VOIX & ENFANCE<small>INITIATIVE INTERASSOCIATIVE</small></span></Link>
    <nav className="nav"><Link href="/proposition">La proposition</Link><Link href="/signataires">Les signataires</Link><Link href="/installer">Installer l’app</Link></nav>
    <Link className="btn btn-primary" href="/signer">Soutenir l&apos;initiative</Link>
  </div></header>;
}
