"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function AdminLogin() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/admin/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: fields.get("email"), password: fields.get("password") }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      router.replace("/admin"); router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Connexion impossible.");
    } finally { setBusy(false); }
  }
  return <form className="panel admin-login" onSubmit={login}>
    <h2>Connexion privée</h2>
    <p className="muted">Seuls les comptes autorisés par un administrateur peuvent accéder à cet espace.</p>
    <div className="field"><label htmlFor="admin-email">Adresse e-mail</label><input id="admin-email" name="email" type="email" autoComplete="username" required /></div>
    <div className="field"><label htmlFor="admin-password">Mot de passe</label><input id="admin-password" name="password" type="password" autoComplete="current-password" required /></div>
    {error && <p className="admin-error" role="alert">{error}</p>}
    <button className="btn btn-primary" disabled={busy}>{busy ? "Connexion…" : "Se connecter"}</button>
  </form>;
}
