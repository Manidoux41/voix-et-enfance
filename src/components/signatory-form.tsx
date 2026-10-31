"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, LockKeyhole } from "lucide-react";

type Submission = {
  id: string; organizationName: string; organizationType: string; representativeName: string;
  representativeRole: string; email: string; phone: string; address: string; website: string;
  status: string; createdAt: string;
};

export function SignatoryForm() {
  const router = useRouter();
  const [read, setRead] = useState(false);
  const [authority, setAuthority] = useState(false);
  const [support, setSupport] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError("");
    if (!read || !authority || !support) { setError("Veuillez confirmer la lecture du document, votre habilitation et le soutien de votre structure."); return; }
    const form = new FormData(e.currentTarget);
    const required = ["organizationName","representativeName","representativeRole","email"];
    for (const key of required) if (!String(form.get(key) || "").trim()) { setError("Veuillez compléter tous les champs obligatoires."); return; }
    setBusy(true);
    const item: Submission = {
      id: crypto.randomUUID(),
      organizationName: String(form.get("organizationName")),
      organizationType: String(form.get("organizationType")),
      representativeName: String(form.get("representativeName")),
      representativeRole: String(form.get("representativeRole")),
      email: String(form.get("email")),
      phone: String(form.get("phone") || ""),
      address: String(form.get("address") || ""),
      website: String(form.get("website") || ""),
      status: "À connecter à OpenSign",
      createdAt: new Date().toISOString()
    };
    try {
      const current = JSON.parse(localStorage.getItem("voix-enfance-demo-signatories") || "[]") as Submission[];
      localStorage.setItem("voix-enfance-demo-signatories", JSON.stringify([item, ...current]));
      setDone(true);
    } catch { setError("Impossible d'enregistrer la demande dans ce navigateur."); }
    finally { setBusy(false); }
  }

  if (done) return <div className="success"><CheckCircle2 size={26}/><h3>Demande enregistrée en mode démonstration</h3><p>Les informations de votre structure ont été conservées dans ce navigateur. Aucune signature électronique n'a encore été créée et aucun e-mail n'a été envoyé, car OpenSign et Supabase ne sont pas configurés.</p><p><strong>Référence :</strong> demande de démonstration</p><button className="btn btn-outline" onClick={() => router.push("/")}>Retour à l'accueil</button></div>;

  return <form onSubmit={submit}>
    <div className="form-grid">
      <div className="field full"><label htmlFor="organizationName">Nom de l'association ou du collectif *</label><input id="organizationName" name="organizationName" required placeholder="Nom de votre structure"/></div>
      <div className="field"><label htmlFor="organizationType">Type de structure</label><select id="organizationType" name="organizationType"><option>Association</option><option>Collectif</option><option>Organisation</option><option>Autre</option></select></div>
      <div className="field"><label htmlFor="website">Site internet</label><input id="website" name="website" type="url" placeholder="https://"/></div>
      <div className="field"><label htmlFor="representativeName">Nom et prénom du représentant *</label><input id="representativeName" name="representativeName" required placeholder="Nom et prénom"/></div>
      <div className="field"><label htmlFor="representativeRole">Fonction *</label><input id="representativeRole" name="representativeRole" required placeholder="Président(e), coordinateur..."/></div>
      <div className="field"><label htmlFor="email">Adresse e-mail *</label><input id="email" name="email" type="email" required placeholder="contact@association.fr"/></div>
      <div className="field"><label htmlFor="phone">Téléphone</label><input id="phone" name="phone" type="tel" placeholder="+33..."/></div>
      <div className="field full"><label htmlFor="address">Coordonnées postales (facultatif)</label><input id="address" name="address" placeholder="Adresse de la structure"/></div>
    </div>
    <div className="notice">Version de référence : proposition de loi interassociative fournie au projet. La version et son empreinte seront enregistrées côté serveur lors de l'activation de Supabase.</div>
    <label className="checkbox-row"><input type="checkbox" checked={read} onChange={e=>setRead(e.target.checked)}/><span>Je confirme avoir consulté et pris connaissance du PDF intégral de la proposition de loi. *</span></label>
    <label className="checkbox-row"><input type="checkbox" checked={authority} onChange={e=>setAuthority(e.target.checked)}/><span>Je déclare être habilité(e) à représenter la structure indiquée. *</span></label>
    <label className="checkbox-row"><input type="checkbox" checked={support} onChange={e=>setSupport(e.target.checked)}/><span>Je souhaite exprimer le soutien de cette structure à l'initiative interassociative et accepte que son nom figure parmi les signataires lors de la transmission aux parlementaires. *</span></label>
    {error && <p style={{color:"#b42318",fontSize:13}} role="alert">{error}</p>}
    <button className="btn btn-primary" type="submit" disabled={busy || !read || !authority || !support}><LockKeyhole size={16}/>{busy ? "Enregistrement..." : "Enregistrer ma demande de soutien"}</button>
    <p className="muted" style={{marginTop:12}}>En mode démonstration, ce formulaire n'équivaut pas à une signature électronique.</p>
  </form>;
}
