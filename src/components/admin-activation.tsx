"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function AdminActivation() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const initialized = useRef(false);
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const value = hash.get("token_hash");
    window.history.replaceState(null, "", window.location.pathname);
    if (value) setToken(value);
    else setError("Ouvrez le lien personnel reçu par e-mail pour activer votre compte.");
  }, []);
  async function activate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/admin/activate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenHash: token, password: fields.get("password"), confirmation: fields.get("confirmation") }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      router.replace("/admin"); router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Activation impossible.");
    } finally { setBusy(false); }
  }
  return <form className="panel admin-login" onSubmit={activate}>
    <h2>Activer votre compte administrateur</h2>
    <p className="notice">Choisissez un mot de passe de 12 à 128 caractères comprenant majuscule, minuscule, chiffre et symbole. Ne partagez jamais votre lien d’invitation.</p>
    <div className="field"><label htmlFor="activation-password">Mot de passe</label><input id="activation-password" name="password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required /></div>
    <div className="field"><label htmlFor="activation-confirmation">Confirmer le mot de passe</label><input id="activation-confirmation" name="confirmation" type="password" autoComplete="new-password" minLength={12} maxLength={128} required /></div>
    {error && <p className="admin-error" role="alert">{error}</p>}
    <button className="btn btn-primary" disabled={busy || !token}>{busy ? "Activation…" : "Activer et me connecter"}</button>
  </form>;
}
