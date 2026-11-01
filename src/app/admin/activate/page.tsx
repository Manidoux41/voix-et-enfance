import { AdminActivation } from "@/components/admin-activation";

export const dynamic = "force-dynamic";
export const metadata = { title: "Activation administrateur — Voix & Enfance", robots: { index: false, follow: false } };

export default function ActivationPage() {
  return <section className="section"><div className="container"><AdminActivation /></div></section>;
}
