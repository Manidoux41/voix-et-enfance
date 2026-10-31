"use client";
import { useEffect, useState } from "react";
type Item = { id:string; organizationName:string; organizationType:string; representativeName:string; representativeRole:string; email:string; status:string; createdAt:string; };
export function AdminDashboard() {
  const [items,setItems] = useState<Item[]>([]);
  useEffect(()=>{ try { setItems(JSON.parse(localStorage.getItem("voix-enfance-demo-signatories") || "[]")); } catch { setItems([]); } },[]);
  const csv = () => {
    const header = ["Structure","Type","Représentant","Fonction","Email","Statut","Date"];
    const rows = items.map(x=>[x.organizationName,x.organizationType,x.representativeName,x.representativeRole,x.email,x.status,x.createdAt]);
    const content = [header,...rows].map(row=>row.map(v=>`"${String(v ?? "").replaceAll('"','""')}"`).join(";")).join("\n");
    const blob = new Blob(["\ufeff"+content],{type:"text/csv;charset=utf-8"});
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href=url; a.download="registre-demo-signataires.csv"; a.click(); URL.revokeObjectURL(url);
  };
  return <>
    <div className="admin-grid"><div className="metric"><span>Demandes enregistrées</span><strong>{items.length}</strong></div><div className="metric"><span>Signatures vérifiées</span><strong>0</strong></div><div className="metric"><span>En attente d'intégration</span><strong>{items.length}</strong></div></div>
    <div className="panel"><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,marginBottom:16,flexWrap:"wrap"}}><h2 style={{margin:0}}>Demandes de soutien</h2><button className="btn btn-outline" onClick={csv} disabled={!items.length}>Exporter CSV</button></div>
      {!items.length ? <p className="muted">Aucune demande enregistrée dans ce navigateur. Les demandes du formulaire apparaîtront ici en mode démonstration.</p> :
      <div className="table-wrap"><table><thead><tr><th>Structure</th><th>Représentant</th><th>E-mail</th><th>Date</th><th>Statut</th></tr></thead><tbody>{items.map(x=><tr key={x.id}><td>{x.organizationName}</td><td>{x.representativeName}<br/><span className="muted">{x.representativeRole}</span></td><td>{x.email}</td><td>{new Date(x.createdAt).toLocaleDateString("fr-FR")}</td><td><span className="status">{x.status}</span></td></tr>)}</tbody></table></div>}
    </div>
  </>;
}
