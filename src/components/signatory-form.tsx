"use client";
import { FormEvent, PointerEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, LockKeyhole, Eraser, PenLine } from "lucide-react";

type Stage = "details" | "otp" | "sign" | "done";
export function SignatoryForm({ documentId }: { documentId: string }) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [stage, setStage] = useState<Stage>("details");
  const [id, setId] = useState("");
  const [code, setCode] = useState("");
  const [read, setRead] = useState(false);
  const [authority, setAuthority] = useState(false);
  const [support, setSupport] = useState(false);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reference, setReference] = useState("");

  async function submitDetails(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError("");
    if (!read || !authority || !support) { setError("Veuillez confirmer la lecture du document, votre habilitation et le soutien de votre structure."); return; }
    const f = new FormData(e.currentTarget);
    const payload = Object.fromEntries(["organizationName","organizationType","representativeName","representativeRole","email","phone","address","website"].map(k => [k, String(f.get(k) || "").trim()]));
    setBusy(true);
    try {
      const r = await fetch("/api/signatories", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({...payload,documentId,hasReadDocument:true,confirmsAuthority:true,confirmsSupport:true}) });
      const data = await r.json(); if (!r.ok) throw new Error(data.error || "Impossible de créer la demande.");
      if (data.status !== "otp_sent" || typeof data.id !== "string" || !data.id) throw new Error("Le serveur n’a pas confirmé l’envoi du code.");
      setId(data.id); setStage("otp");
    } catch(e) { setError(e instanceof Error ? e.message : "Erreur inattendue."); } finally { setBusy(false); }
  }
  async function verifyCode(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError(""); setBusy(true);
    try { const r = await fetch("/api/signatories/verify", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,code})}); const d=await r.json(); if(!r.ok) throw new Error(d.error||"Code refusé."); setStage("sign"); }
    catch(e){setError(e instanceof Error?e.message:"Erreur inattendue.");} finally{setBusy(false);}
  }
  function point(e: PointerEvent<HTMLCanvasElement>) { const c=canvasRef.current; if(!c)return; const rect=c.getBoundingClientRect(); return {x:(e.clientX-rect.left)*(c.width/rect.width),y:(e.clientY-rect.top)*(c.height/rect.height)}; }
  function start(e: PointerEvent<HTMLCanvasElement>) { const c=canvasRef.current; if(!c)return; c.setPointerCapture(e.pointerId); const p=point(e); if(!p)return; const ctx=c.getContext("2d"); if(!ctx)return; drawing.current=true; ctx.beginPath();ctx.moveTo(p.x,p.y); }
  function move(e: PointerEvent<HTMLCanvasElement>) { if(!drawing.current)return;const c=canvasRef.current;const p=point(e);const ctx=c?.getContext("2d");if(!p||!ctx)return;ctx.lineWidth=2.4;ctx.lineCap="round";ctx.lineJoin="round";ctx.strokeStyle="#172b45";ctx.lineTo(p.x,p.y);ctx.stroke(); }
  function clearSignature(){const c=canvasRef.current;const ctx=c?.getContext("2d");if(c&&ctx)ctx.clearRect(0,0,c.width,c.height);}
  async function sign() { setError(""); const c=canvasRef.current; if(!c || !consent){setError("Veuillez signer dans le cadre et accepter la déclaration de signature.");return;} const blank=document.createElement("canvas");blank.width=c.width;blank.height=c.height;if(c.toDataURL()===blank.toDataURL()){setError("Veuillez apposer votre signature.");return;} setBusy(true); try {const r=await fetch("/api/signatories/sign",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,signatureDataUrl:c.toDataURL("image/png"),consent:true})});const d=await r.json();if(!r.ok)throw new Error(d.error||"Signature impossible.");setReference(d.hash);setStage("done");}catch(e){setError(e instanceof Error?e.message:"Erreur inattendue.");}finally{setBusy(false);}}
  if(stage==="done") return <div className="success"><CheckCircle2 size={28}/><h3>Signature enregistrée</h3><p>Le document signé et son empreinte ont été conservés dans l&apos;espace sécurisé. Une copie téléchargeable et un reçu par e-mail pourront être ajoutés dans la prochaine étape.</p><p><strong>Empreinte SHA-256 du PDF signé :</strong><br/><code style={{overflowWrap:"anywhere"}}>{reference}</code></p><button className="btn btn-outline" onClick={()=>router.push("/")}>Retour à l&apos;accueil</button></div>;
  if(stage==="otp") return <form onSubmit={verifyCode}><h3>Vérification de votre adresse e-mail</h3><p className="muted">Un code à six chiffres vient d&apos;être envoyé à l&apos;adresse indiquée. Il expire après 10 minutes.</p><div className="field"><label htmlFor="otp">Code de confirmation</label><input id="otp" inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="[0-9]{6}" required value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,""))} placeholder="000000"/></div>{error&&<p role="alert" style={{color:"#b42318"}}>{error}</p>}<button className="btn btn-primary" disabled={busy||code.length!==6}>{busy?"Vérification…":"Vérifier mon adresse e-mail"}</button></form>;
  if(stage==="sign") return <div><h3><PenLine size={18}/> Apposer votre signature</h3><p className="muted">Signez dans le cadre avec votre souris, votre trackpad ou votre doigt.</p><div style={{border:"1px solid #cbd5e1",borderRadius:10,overflow:"hidden",background:"#fff",touchAction:"none"}}><canvas ref={canvasRef} width={900} height={260} style={{display:"block",width:"100%",height:180,touchAction:"none",cursor:"crosshair"}} onPointerDown={start} onPointerMove={move} onPointerUp={()=>drawing.current=false} onPointerCancel={()=>drawing.current=false}/></div><button type="button" className="btn btn-outline" style={{marginTop:10}} onClick={clearSignature}><Eraser size={15}/> Effacer la signature</button><label className="checkbox-row" style={{marginTop:18}}><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/><span>Je confirme signer personnellement au nom de la structure déclarée, après avoir consulté le document dans sa version présentée. Je comprends que cette signature électronique simple ne constitue pas une signature qualifiée au sens du règlement eIDAS. *</span></label>{error&&<p role="alert" style={{color:"#b42318"}}>{error}</p>}<button className="btn btn-primary" disabled={busy||!consent} onClick={sign}><LockKeyhole size={16}/>{busy?"Enregistrement sécurisé…":"Confirmer et finaliser la signature"}</button></div>;
  return <form onSubmit={submitDetails}><div className="form-grid">
    <div className="field full"><label htmlFor="organizationName">Nom de l&apos;association ou du collectif *</label><input id="organizationName" name="organizationName" required minLength={2} maxLength={200} placeholder="Nom de votre structure"/></div>
    <div className="field"><label htmlFor="organizationType">Type de structure</label><select id="organizationType" name="organizationType"><option>Association</option><option>Collectif</option><option>Organisation</option><option>Autre</option></select></div>
    <div className="field"><label htmlFor="website">Site internet</label><input id="website" name="website" type="url" placeholder="https://"/></div>
    <div className="field"><label htmlFor="representativeName">Nom et prénom du représentant *</label><input id="representativeName" name="representativeName" required minLength={2}/></div>
    <div className="field"><label htmlFor="representativeRole">Fonction *</label><input id="representativeRole" name="representativeRole" required minLength={2}/></div>
    <div className="field"><label htmlFor="email">Adresse e-mail *</label><input id="email" name="email" type="email" required/></div>
    <div className="field"><label htmlFor="phone">Téléphone</label><input id="phone" name="phone" type="tel"/></div>
    <div className="field full"><label htmlFor="address">Adresse postale (facultatif)</label><input id="address" name="address"/></div>
  </div>
  <div className="notice">La signature portera sur la version active de la proposition publiée par l&apos;équipe du site. Son empreinte cryptographique sera vérifiée avant la finalisation.</div>
  <label className="checkbox-row"><input type="checkbox" checked={read} onChange={e=>setRead(e.target.checked)}/><span>Je confirme avoir consulté et pris connaissance du PDF intégral de la proposition. *</span></label>
  <label className="checkbox-row"><input type="checkbox" checked={authority} onChange={e=>setAuthority(e.target.checked)}/><span>Je déclare être habilité(e) à représenter la structure indiquée. *</span></label>
  <label className="checkbox-row"><input type="checkbox" checked={support} onChange={e=>setSupport(e.target.checked)}/><span>Je souhaite exprimer le soutien de cette structure à l&apos;initiative et accepte que son nom figure parmi les signataires lors de la transmission aux parlementaires. *</span></label>
  {error&&<p role="alert" style={{color:"#b42318",fontSize:13}}>{error}</p>}
  <button className="btn btn-primary" type="submit" disabled={busy||!read||!authority||!support}><LockKeyhole size={16}/>{busy?"Préparation…":"Continuer vers la vérification e-mail"}</button>
  <p className="muted" style={{marginTop:12}}>La validation de l&apos;adresse e-mail précède la signature. Aucun document n&apos;est signé à cette étape.</p>
  </form>;
}
