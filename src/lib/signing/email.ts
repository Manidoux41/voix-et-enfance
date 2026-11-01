import "server-only";
import { z } from "zod";

export async function sendOtpEmail(
  email: string,
  code: string,
  organization: string
) {
  const message = `Bonjour,

Vous avez engagé une démarche de signature pour ${organization}.

Votre code de confirmation est : ${code}

Il est valable 10 minutes et ne doit être communiqué à personne.

Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.

L'équipe Voix & Enfance`;
  return sendTransactionalEmail(email, "Votre code de validation – Voix & Enfance", message);
}

export async function sendTransactionalEmail(email: string, subject: string, textContent: string) {
  const key = process.env.BREVO_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!key || !from) {
    throw new Error(
      "Le service e-mail n'est pas configuré (BREVO_API_KEY / EMAIL_FROM)."
    );
  }

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": key,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      sender: {
        name: "Voix & Enfance",
        email: from,
      },
      to: [
        {
          email,
        },
      ],
      subject,
      textContent,
    }),
  });

  if (!response.ok) {
    console.error("Envoi refusé par Brevo :", { status: response.status });

    throw new Error(
      `Échec de l'envoi du courriel via Brevo (${response.status}).`
    );
  }
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    console.error("Réponse Brevo illisible :", { status: response.status });
    throw new Error("Le service e-mail n’a pas confirmé la prise en charge du courriel.");
  }
  const parsed = z.object({ messageId: z.string().trim().min(1).max(512) }).safeParse(body);
  if (!parsed.success) {
    console.error("Réponse Brevo sans identifiant de message :", { status: response.status });
    throw new Error("Le service e-mail n’a pas confirmé la prise en charge du courriel.");
  }
  console.info("Courriel accepté par Brevo :", { messageId: parsed.data.messageId });
  return parsed.data.messageId;
}