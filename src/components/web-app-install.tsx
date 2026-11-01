"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useWebApp } from "@/components/web-app-provider";

export function WebAppInstall() {
  const { prompt, installed, secure, error, install } = useWebApp();
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");
  useEffect(() => { setUrl(new URL("/installer", window.location.origin).href); }, []);
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopyStatus("Lien copié.");
    } catch (error) {
      console.error("Copie du lien d’installation impossible :", error);
      setCopyStatus("Copie impossible. Sélectionnez et copiez le lien affiché.");
    }
  }
  return <div className="install-grid">
    <div className="panel">
      <h2>Installer sur ce téléphone</h2>
      <p>Retrouvez Voix &amp; Enfance sur votre écran d’accueil, dans une fenêtre dédiée.</p>
      {installed ? <p className="success" role="status">Vous utilisez déjà l’application installée.</p> : <>
        {!secure && <p className="notice">L’installation nécessite une connexion HTTPS. Ouvrez le site public sécurisé sur votre téléphone.</p>}
        {prompt && secure ? <button className="btn btn-primary" disabled={busy} onClick={async () => {
          setBusy(true);
          try { await install(); } finally { setBusy(false); }
        }}>{busy ? "Ouverture de l’installation…" : "Installer Voix & Enfance"}</button>
          : <p className="notice">Si le bouton d’installation n’apparaît pas, suivez les instructions ci-dessous. Depuis une messagerie ou un réseau social, ouvrez d’abord le lien dans Safari ou Chrome.</p>}
        <h3>Android — Chrome ou navigateur compatible</h3>
        <ol><li>Ouvrez cette page dans le navigateur.</li><li>Appuyez sur « Installer » si proposé, ou ouvrez le menu ⋮ puis « Installer l’application » / « Ajouter à l’écran d’accueil ».</li><li>Confirmez l’installation.</li></ol>
        <h3>iPhone / iPad — Safari</h3>
        <ol><li>Ouvrez cette page dans Safari.</li><li>Appuyez sur Partager, puis « Ajouter à l’écran d’accueil ».</li><li>Si proposé, activez « Ouvrir comme app web », puis appuyez sur « Ajouter ».</li></ol>
      </>}
      {error && <p className="admin-error" role="alert">{error}</p>}
      <p className="muted">Une connexion Internet reste nécessaire pour consulter les documents, signer et accéder à l’administration. Installer l’application ne crée pas de compte et ne donne aucun droit administrateur.</p>
    </div>
    <div className="panel install-share">
      <h2>Partager l’installation</h2>
      <p>Scannez ce QR code avec l’appareil photo du téléphone pour ouvrir la page d’installation.</p>
      {url ? <>
        <div className="install-qr"><QRCodeSVG value={url} size={240} level="M" marginSize={4} title="Lien vers la page d’installation de Voix & Enfance" /></div>
        <a className="install-link" href={url}>{url}</a>
        <button type="button" className="btn btn-outline" onClick={() => void copy()}>Copier le lien</button>
        {copyStatus && <p role="status">{copyStatus}</p>}
      </> : <p role="status">Préparation du lien et du QR code…</p>}
      <p className="muted">Le QR code est généré sur votre appareil, sans service externe. L’installation nécessite votre confirmation ; il n’installe rien automatiquement.</p>
    </div>
  </div>;
}
