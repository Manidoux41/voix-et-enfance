"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { canPublish, type AdminItem, type AuditItem, type DocumentItem, type Paged, type Signatory } from "@/lib/admin/types";
import { pageLabels, type ContentPage, type ContentRecord } from "@/lib/content-fields";

type Tab = "signatories" | "documents" | "users" | "content" | "audit" | "account";
type Registry = Paged<Signatory> & { metrics: { total: number; signed: number; published: number } };
const tabs: Record<Tab, string> = { signatories: "Signatures", documents: "Documents PDF", users: "Comptes autorisés", content: "Contenus des pages", audit: "Journal d’audit", account: "Mon compte" };
const statuses: Record<string, string> = { signed: "Signée", pending_signature: "En attente de signature", submitted: "Soumise", rejected: "Rejetée", withdrawn: "Retirée", otp_pending: "Code envoyé", verified: "E-mail vérifié", expired: "Expirée", not_started: "Non commencée" };
const fieldLabels: Record<string, string> = {
  title: "Titre principal", introduction: "Introduction", eyebrow: "Surtitre",
  collectiveTitle: "Titre : démarche collective", collectiveText: "Texte : démarche collective",
  textTitle: "Titre : texte commun", textDescription: "Description : texte commun",
  mobilizationTitle: "Titre : mobilisation", mobilizationDescription: "Description : mobilisation",
  transparencyTitle: "Titre : transparence", transparencyDescription: "Description : transparence",
  objectivesTitle: "Titre des objectifs", objectivesText: "Présentation des objectifs",
  dangerTitle: "Titre : danger", dangerText: "Texte : danger", controlTitle: "Titre : contrôle", controlText: "Texte : contrôle",
  coordinationTitle: "Titre : pilotage", coordinationText: "Texte : pilotage",
  ctaTitle: "Titre de l’appel à consulter", ctaText: "Texte de l’appel à consulter",
  notice: "Consigne de lecture", formTitle: "Titre du formulaire", formIntroduction: "Introduction du formulaire",
  registerTitle: "Titre du registre", privacyTitle: "Titre : confidentialité", privacyText: "Politique de confidentialité",
  publisherTitle: "Titre : mentions légales", publisherText: "Éditeur, hébergement et contact",
};

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/api/admin/${path}`, { cache: "no-store", ...options });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || "Opération impossible.");
  return body;
}
const json = (method: string, body: unknown): RequestInit => ({ method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
const date = (value: string) => new Date(value).toLocaleString("fr-FR");

function ContentEditor({ record, busy, onSave }: { record: ContentRecord; busy: boolean; onSave: (record: ContentRecord) => Promise<boolean> }) {
  const [fields, setFields] = useState(record.fields);
  return <form onSubmit={event => { event.preventDefault(); void onSave({ ...record, fields }); }}>
    <p className="muted">Textes simples uniquement : aucun HTML exécuté. Les consentements et les preuves de signature ne sont pas modifiables ici.</p>
    {Object.entries(fields).map(([key, value]) => <div className="field" key={key}>
      <label htmlFor={`content-${key}`}>{fieldLabels[key] ?? key}</label>
      <textarea id={`content-${key}`} value={value} required maxLength={10000} rows={value.length > 150 ? 5 : 2} onChange={event => setFields({ ...fields, [key]: event.target.value })} />
    </div>)}
    <button className="btn btn-primary" disabled={busy}>Enregistrer et publier ces textes</button>
  </form>;
}

export function AdminDashboard({ email, userId }: { email: string; userId: string }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("signatories");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [draftSearch, setDraftSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [revision, setRevision] = useState(0);
  const [registry, setRegistry] = useState<Registry>();
  const [documents, setDocuments] = useState<Paged<DocumentItem>>();
  const [users, setUsers] = useState<Paged<AdminItem>>();
  const [audit, setAudit] = useState<Paged<AuditItem>>();
  const [content, setContent] = useState<ContentRecord[]>([]);
  const [contentPage, setContentPage] = useState<ContentPage>("home");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError("");
    async function load() {
      const options = { signal: controller.signal };
      if (tab === "signatories") setRegistry(await api<Registry>(`signatories?page=${page}&status=${encodeURIComponent(status)}&search=${encodeURIComponent(search)}`, options));
      if (tab === "documents") setDocuments(await api<Paged<DocumentItem>>(`documents?page=${page}`, options));
      if (tab === "users") setUsers(await api<Paged<AdminItem>>(`users?page=${page}`, options));
      if (tab === "audit") setAudit(await api<Paged<AuditItem>>(`audit?page=${page}`, options));
      if (tab === "content") setContent((await api<{ items: ContentRecord[] }>("content", options)).items);
    }
    void load().catch(error => {
      if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Chargement impossible.");
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [tab, page, status, search, revision]);

  async function perform(action: () => Promise<unknown>, success: string): Promise<boolean> {
    setBusy(true); setError(""); setMessage("");
    try {
      await action(); setMessage(success); setRevision(value => value + 1); router.refresh();
      return true;
    } catch (error) {
      setError(error instanceof Error ? error.message : "Opération impossible.");
      return false;
    } finally { setBusy(false); }
  }
  async function logout() {
    await perform(async () => {
      await api("session", { method: "DELETE" });
      router.replace("/admin/login"); router.refresh();
    }, "Déconnexion effectuée.");
  }
  async function exportCsv() {
    await perform(async () => {
      const response = await fetch("/api/admin/export", { cache: "no-store" });
      if (!response.ok) throw new Error((await response.json()).error);
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url; link.download = "registre-signataires.csv"; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, "Registre exporté. Ce fichier contient des données personnelles : conservez-le dans un espace privé.");
  }
  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    const uploaded = await perform(() => api("documents", { method: "POST", body: fields }), "PDF enregistré. Vérifiez-le, puis activez-le pour les nouvelles demandes.");
    if (uploaded) form.reset();
  }
  async function authorize(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    const saved = await perform(() => api("users", json("POST", { userId: fields.get("userId"), role: "admin" })), "Compte administrateur autorisé.");
    if (saved) form.reset();
  }
  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    const saved = await perform(() => api("invitations", json("POST", { email: fields.get("email") })), "Invitation administrateur envoyée. Le destinataire choisira son mot de passe par e-mail.");
    if (saved) form.reset();
  }
  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    const saved = await perform(() => api("password", json("PUT", {
      currentPassword: fields.get("currentPassword"), password: fields.get("password"), confirmation: fields.get("confirmation"),
    })), "Votre mot de passe a été modifié.");
    if (saved) form.reset();
  }
  const count = tab === "signatories" ? registry?.count : tab === "documents" ? documents?.count : tab === "users" ? users?.count : audit?.count;
  const currentContent = content.find(item => item.page === contentPage);

  return <>
    <div className="admin-toolbar">
      <p className="muted">Connecté : {email}</p>
      <div className="admin-actions"><button type="button" className="btn btn-outline" disabled={busy || loading} onClick={() => setRevision(value => value + 1)}>Actualiser</button><button type="button" className="btn btn-outline" disabled={busy} onClick={logout}>Se déconnecter</button></div>
    </div>
    <nav className="admin-tabs" aria-label="Rubriques administratives">
      {(Object.keys(tabs) as Tab[]).map(key => <button type="button" className={`btn ${tab === key ? "btn-primary" : "btn-outline"}`} key={key} disabled={busy} aria-current={tab === key ? "page" : undefined} onClick={() => { setTab(key); setPage(1); setMessage(""); }}>{tabs[key]}</button>)}
    </nav>
    {error && <p className="admin-error" role="alert">{error}</p>}
    {message && <p className="success" role="status">{message}</p>}
    {tab === "signatories" && <>
      {registry && <div className="admin-grid">
        <div className="metric"><span>Demandes</span><strong>{registry.metrics.total}</strong></div>
        <div className="metric"><span>Signatures finalisées</span><strong>{registry.metrics.signed}</strong></div>
        <div className="metric"><span>Structures publiées</span><strong>{registry.metrics.published}</strong></div>
      </div>}
      <form className="admin-toolbar panel" onSubmit={event => { event.preventDefault(); setPage(1); setSearch(draftSearch); }}>
        <div className="field"><label htmlFor="registry-search">Rechercher une structure</label><input id="registry-search" maxLength={200} value={draftSearch} onChange={event => setDraftSearch(event.target.value)} /></div>
        <div className="field"><label htmlFor="registry-status">Statut</label><select id="registry-status" value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}><option value="all">Toutes les demandes</option><option value="published">Publiées</option>{["signed","pending_signature","submitted","rejected","withdrawn"].map(value => <option value={value} key={value}>{statuses[value]}</option>)}</select></div>
        <button className="btn btn-outline">Rechercher</button><button type="button" className="btn btn-outline" disabled={busy} onClick={exportCsv}>Exporter tout le registre CSV</button>
      </form>
    </>}
    {loading ? <p role="status">Chargement…</p> : !error && <>
      {tab === "signatories" && <div className="panel">
        <h2>Demandes et signatures</h2><p className="muted">Seules les structures ayant une signature finalisée peuvent être publiées. Les coordonnées et les preuves restent privées.</p>
        {!registry?.items.length ? <p>Aucune demande pour ces critères.</p> : <div className="table-wrap"><table><thead><tr><th>Structure</th><th>Représentant et coordonnées</th><th>Statut</th><th>Actions</th></tr></thead><tbody>
          {registry.items.map(item => <tr key={item.id}>
            <td><strong>{item.organization_name}</strong><br />{item.organization_type}<br /><span className="muted">{date(item.created_at)}</span></td>
            <td>{item.representative_name}<br />{item.representative_role}<br />{item.email}
              <details><summary>Voir les coordonnées et preuves</summary><p>Téléphone : {item.phone || "Non renseigné"}<br />Adresse : {item.address || "Non renseignée"}<br />Site : {item.website || "Non renseigné"}</p>
                {item.signatures.map(sig => <p key={sig.id}>Signature : {statuses[sig.status] ?? sig.status}<br />{sig.signed_at && date(sig.signed_at)}<br /><code className="admin-hash">{sig.signed_pdf_hash}</code></p>)}
              </details>
            </td>
            <td><span className="status">{statuses[item.status] ?? item.status}</span><p>{item.published_at ? "Publiée" : "Non publiée"}</p></td>
            <td><div className="admin-actions">
              <button type="button" className="btn btn-outline" disabled={busy || (!item.published_at && !canPublish(item))} onClick={() => {
                if (window.confirm(`${item.published_at ? "Retirer du registre public" : "Publier le nom et le type de"} : ${item.organization_name} ?`))
                  void perform(() => api("signatories", json("PATCH", { id: item.id, publish: !item.published_at })), item.published_at ? "Structure retirée du registre public." : "Structure publiée.");
              }}>{item.published_at ? "Retirer la publication" : "Publier"}</button>
              {item.signatures.filter(sig => sig.status === "signed" && sig.signed_pdf_path).map(sig => <button type="button" className="btn btn-outline" disabled={busy} key={sig.id} onClick={() => void perform(async () => {
                const data = await api<{ url: string }>("signatures/download", json("POST", { id: sig.id }));
                const link = document.createElement("a"); link.href = data.url; link.rel = "noreferrer"; link.click();
              }, "Lien de téléchargement privé créé (validité : 60 secondes).")}>Télécharger le PDF signé</button>)}
            </div></td>
          </tr>)}
        </tbody></table></div>}
      </div>}
      {tab === "documents" && <>
        <form className="panel" onSubmit={upload}>
          <h2>Ajouter une version PDF</h2><p className="notice">Le téléversement ne change pas le document actif. Les demandes déjà créées restent attachées à leur version d’origine. Maximum : 3 Mo, pour respecter les limites de Vercel.</p>
          <div className="form-grid">
            <div className="field"><label htmlFor="doc-title">Titre</label><input id="doc-title" name="title" required minLength={2} maxLength={200} /></div>
            <div className="field"><label htmlFor="doc-version">Version (ex. 2026-11-v2)</label><input id="doc-version" name="version" required maxLength={40} /></div>
            <div className="field full"><label htmlFor="doc-file">PDF non protégé</label><input id="doc-file" type="file" name="file" required accept="application/pdf" /></div>
          </div><button className="btn btn-primary" disabled={busy}>Enregistrer la version</button>
        </form>
        <div className="panel admin-section"><h2>Versions enregistrées</h2>
          {!documents?.items.length ? <p>Aucun document enregistré.</p> : documents.items.map(doc => <article key={doc.id} className="admin-document">
            <h3>{doc.title} — {doc.version} {doc.is_active && <span className="status">Version active</span>}</h3>
            <p className="muted">{date(doc.created_at)}</p><code className="admin-hash">{doc.sha256_hash}</code>
            <div className="admin-actions"><a className="btn btn-outline" href={`/api/documents/pdf?id=${doc.id}`} target="_blank" rel="noreferrer">Consulter le PDF</a>
              <button type="button" className="btn btn-primary" disabled={busy || doc.is_active} onClick={() => {
                if (window.confirm(`Activer la version ${doc.version} pour les nouvelles signatures et la page publique ?`)) void perform(() => api("documents", json("PATCH", { id: doc.id })), "Document actif modifié.");
              }}>Activer cette version</button></div>
          </article>)}
        </div>
      </>}
      {tab === "users" && <>
        <form className="panel" onSubmit={invite}><h2>Créer un administrateur par invitation</h2>
          <p className="notice">Le destinataire recevra un lien personnel pour confirmer son adresse et choisir son mot de passe. Il disposera de tous les droits administrateur.</p>
          <div className="field"><label htmlFor="invited-email">Adresse e-mail</label><input id="invited-email" name="email" type="email" required maxLength={254} /></div>
          <button className="btn btn-primary" disabled={busy}>Envoyer l’invitation</button>
        </form>
        <form className="panel" onSubmit={authorize}><h2>Autoriser un administrateur</h2><p className="notice">Créez d’abord un compte avec e-mail confirmé dans Supabase → Authentication → Users, puis copiez son identifiant UUID ici. Aucune inscription administrateur publique.</p>
          <div className="field"><label htmlFor="authorized-user">Identifiant UUID du compte Supabase</label><input id="authorized-user" name="userId" required pattern="[0-9a-fA-F-]{36}" /></div><button className="btn btn-primary" disabled={busy}>Autoriser ce compte</button>
        </form>
        <div className="panel admin-section"><h2>Comptes autorisés</h2><div className="table-wrap"><table><thead><tr><th>Compte</th><th>Rôle</th><th>Actions</th></tr></thead><tbody>
          {users?.items.map(item => <tr key={item.user_id}><td>{item.email}<br /><code>{item.user_id}</code></td><td>{item.role === "admin" ? "Administrateur" : "Reviewer (accès désactivé)"}</td><td><div className="admin-actions">
            {item.role !== "admin" && <button type="button" className="btn btn-outline" disabled={busy} onClick={() => {
              if (window.confirm(`Accorder tous les droits administrateur à ${item.email} ?`)) void perform(() => api("users", json("POST", { userId: item.user_id, role: "admin" })), "Compte promu administrateur.");
            }}>Promouvoir administrateur</button>}
            <button type="button" className="btn btn-outline" disabled={busy || item.user_id === userId} onClick={() => {
              if (window.confirm(`Révoquer l’accès de ${item.email} ? Le compte Supabase sera conservé.`)) void perform(() => api("users", json("POST", { userId: item.user_id, role: null })), "Droits révoqués.");
            }}>{item.user_id === userId ? "Votre compte" : "Révoquer les droits"}</button>
          </div></td></tr>)}
        </tbody></table></div></div>
      </>}
      {tab === "account" && <form className="panel" onSubmit={changePassword}>
        <h2>Modifier mon mot de passe</h2>
        <p className="notice">Le nouveau mot de passe doit comporter 12 à 128 caractères, avec majuscule, minuscule, chiffre et symbole.</p>
        <div className="field"><label htmlFor="account-current-password">Mot de passe actuel</label><input id="account-current-password" name="currentPassword" type="password" autoComplete="current-password" required maxLength={256} /></div>
        <div className="field"><label htmlFor="account-password">Nouveau mot de passe</label><input id="account-password" name="password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required /></div>
        <div className="field"><label htmlFor="account-confirmation">Confirmer le nouveau mot de passe</label><input id="account-confirmation" name="confirmation" type="password" autoComplete="new-password" minLength={12} maxLength={128} required /></div>
        <button className="btn btn-primary" disabled={busy}>Modifier mon mot de passe</button>
      </form>}
      {tab === "content" && <div className="panel"><h2>Modifier les pages publiques</h2>
        <div className="field"><label htmlFor="content-page">Page</label><select id="content-page" value={contentPage} onChange={event => {
          const value = event.target.value;
          if (value in pageLabels && window.confirm("Changer de page ? Enregistrez d’abord les modifications à conserver.")) setContentPage(value as ContentPage);
        }}>{(Object.keys(pageLabels) as ContentPage[]).map(key => <option value={key} key={key}>{pageLabels[key]}</option>)}</select></div>
        {currentContent && <ContentEditor key={`${currentContent.page}-${currentContent.revision}`} record={currentContent} busy={busy} onSave={record => perform(() => api("content", json("PUT", { page: record.page, fields: record.fields, revision: record.revision })), "Contenu publié.")} />}
      </div>}
      {tab === "audit" && <div className="panel"><h2>Journal d’audit</h2><p className="muted">Consultation seule. Les événements ne sont pas modifiables depuis le tableau de bord.</p>
        {!audit?.items.length ? <p>Aucun événement enregistré.</p> : <div className="table-wrap"><table><thead><tr><th>Date</th><th>Action</th><th>Acteur / objet</th><th>Détails</th></tr></thead><tbody>
          {audit.items.map(item => <tr key={item.id}><td>{date(item.created_at)}</td><td>{item.action}</td><td>{item.actor_id ?? "Parcours public"}<br />{item.entity_type}<br />{item.entity_id}</td><td><pre className="admin-metadata">{JSON.stringify(item.metadata, null, 2)}</pre></td></tr>)}
        </tbody></table></div>}
      </div>}
      {tab !== "content" && tab !== "account" && <div className="admin-toolbar"><p className="muted">{count ?? 0} résultats — page {page}</p><div className="admin-actions">
        <button type="button" className="btn btn-outline" disabled={busy || page === 1} onClick={() => setPage(value => value - 1)}>Précédente</button><button type="button" className="btn btn-outline" disabled={busy || page * 25 >= (count ?? 0)} onClick={() => setPage(value => value + 1)}>Suivante</button>
      </div></div>}
    </>}
  </>;
}
