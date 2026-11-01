import { AdminLogin } from "@/components/admin-login";
export const dynamic = "force-dynamic";
export const metadata = { title: "Connexion administrateur — Voix & Enfance", robots: { index: false, follow: false } };
export default function LoginPage() {
  return <section className="section"><div className="container"><AdminLogin /></div></section>;
}
