import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { WebAppProvider } from "@/components/web-app-provider";

export const metadata: Metadata = {
  title: "Voix & Enfance — Initiative interassociative",
  description: "Consulter et soutenir la proposition de loi sur la protection de l'enfance.",
  applicationName: "Voix & Enfance",
  appleWebApp: { capable: true, title: "Voix & Enfance", statusBarStyle: "default" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = { themeColor: "#172b45" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>
        <WebAppProvider>
        <SiteHeader />
        <main>{children}</main>
        <SiteFooter />
        </WebAppProvider>
      </body>
    </html>
  );
}
