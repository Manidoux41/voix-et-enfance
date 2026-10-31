import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link
          href="/"
          className="brand"
          aria-label="Voix et Enfance — accueil"
        >
          <span className="brand-mark" aria-hidden="true">
            V
          </span>

          <span>
            VOIX &amp; ENFANCE
            <small>INITIATIVE INTERASSOCIATIVE</small>
          </span>
        </Link>

        <nav className="nav" aria-label="Navigation principale">
          <Link href="/proposition">La proposition</Link>
          <Link href="/signataires">Les signataires</Link>
          <Link href="/admin">Administration</Link>
        </nav>

        <Link className="btn btn-primary" href="/signer">
          Soutenir l&apos;initiative
        </Link>
      </div>
    </header>
  );
}