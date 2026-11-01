import "server-only";
export async function sendOtpEmail(email: string, code: string, organization: string) {
  const key = process.env.RESEND_API_KEY; const from = process.env.EMAIL_FROM;
  if (!key || !from) throw new Error("Le service e-mail n'est pas configuré (RESEND_API_KEY / EMAIL_FROM).");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [email], subject: "Votre code de validation – Voix & Enfance",
      text: `Bonjour,\n\nVous avez engagé une démarche de signature pour ${organization}.\n\nVotre code de confirmation est : ${code}\nIl est valable 10 minutes et ne doit être communiqué à personne.\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez ce message.` })
  });
  if (!response.ok) throw new Error(`Échec de l'envoi du courriel (${response.status}).`);
}
