import { redirect } from "next/navigation";
import { AdminError, requireAdmin } from "@/lib/admin/auth";
import { AdminDashboard } from "@/components/admin-dashboard";
export const dynamic = "force-dynamic";
export const metadata = { title: "Administration — Voix & Enfance", robots: { index: false, follow: false } };
export default async function AdminPage() {
  let admin;
  try { admin = await requireAdmin(); }
  catch (error) {
    if (error instanceof AdminError && error.status === 401) redirect("/admin/login");
    if (error instanceof AdminError && error.status === 403) return <section className="section"><div className="container notice">Accès refusé : ce compte ne possède pas de droits administrateur.</div></section>;
    throw error;
  }
  return <><section className="page-top"><div className="container"><h1>Administration</h1><p>Publication, signatures, documents et gestion du site.</p></div></section><section className="section"><div className="container"><AdminDashboard email={admin.user.email ?? ""} userId={admin.user.id} /></div></section></>;
}
