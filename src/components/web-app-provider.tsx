"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

interface InstallPrompt extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

type WebAppState = {
  prompt: InstallPrompt | null;
  installed: boolean;
  secure: boolean;
  error: string;
  install: () => Promise<void>;
};

const WebAppContext = createContext<WebAppState | null>(null);

export function WebAppProvider({ children }: { children: ReactNode }) {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(false);
  const [secure, setSecure] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    const mode = window.matchMedia("(display-mode: standalone)");
    const updateInstalled = () => setInstalled(mode.matches || ("standalone" in navigator && navigator.standalone === true));
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPrompt);
    };
    const onInstalled = () => { setInstalled(true); setPrompt(null); };
    updateInstalled();
    setSecure(window.isSecureContext);
    mode.addEventListener("change", updateInstalled);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    if (window.isSecureContext && "serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(error => {
        console.error("Activation de la webapp impossible :", error);
        setError("Le service de la webapp n’a pas pu être activé. Rechargez la page ou utilisez le menu du navigateur.");
      });
    }
    return () => {
      mode.removeEventListener("change", updateInstalled);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (!prompt) return;
    setError("");
    try {
      await prompt.prompt();
      await prompt.userChoice;
    } catch (error) {
      console.error("Installation de la webapp impossible :", error);
      setError("La demande d’installation a échoué. Utilisez le menu du navigateur ou rechargez la page.");
    } finally { setPrompt(null); }
  }

  return <WebAppContext.Provider value={{ prompt, installed, secure, error, install }}>{children}</WebAppContext.Provider>;
}

export function useWebApp() {
  const value = useContext(WebAppContext);
  if (!value) throw new Error("Le service d’installation de la webapp est indisponible.");
  return value;
}
