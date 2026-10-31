import { AdminDashboard } from "@/components/admin-dashboard";
export default function AdminPage() {
  return <><section className="page-top"><div className="container"><h1>Administration</h1><p>Vue de démonstration des demandes de soutien enregistrées sur ce navigateur.</p></div></section><section className="section"><div className="container"><div className="notice" style={{marginBottom:20}}>Espace provisoire non protégé pour démonstration locale uniquement. Avant mise en ligne, remplacer par Supabase Auth et des autorisations serveur.</div><AdminDashboard/></div></section></>;
}
