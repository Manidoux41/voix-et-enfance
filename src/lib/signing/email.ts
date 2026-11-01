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
  const key = process.env.MAILJET_API_KEY;
  const secret = process.env.MAILJET_SECRET_KEY;
  const from = process.env.EMAIL_FROM;

  if (!key || !secret || !from) {
    throw new Error(
      "Le service e-mail n'est pas configuré (MAILJET_API_KEY / MAILJET_SECRET_KEY / EMAIL_FROM)."
    );
  }

  const response = await fetch("https://api.mailjet.com/v3.1/send", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${key}:${secret}`).toString("base64")}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      Messages: [{
        From: { Name: "Voix & Enfance", Email: from },
        To: [{ Email: email }],
        Subject: subject,
        TextPart: textContent,
      }],
    }),
  });

  if (!response.ok) {
    console.error("Envoi refusé par Mailjet :", { status: response.status });

    throw new Error(
      `Échec de l'envoi du courriel via Mailjet (${response.status}).`
    );
  }
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    console.error("Réponse Mailjet illisible :", { status: response.status });
    throw new Error("Le service e-mail n’a pas confirmé la prise en charge du courriel.");
  }
  const parsed = z.object({
    Messages: z.array(z.object({
      Status: z.literal("success"),
      To: z.array(z.object({
        Email: z.string().email(),
        MessageUUID: z.string().trim().min(1).max(512),
      })).length(1),
    })).length(1),
  }).safeParse(body);
  if (!parsed.success) {
    console.error("Réponse Mailjet sans confirmation de succès et identifiant de message :", { status: response.status });
    throw new Error("Le service e-mail n’a pas confirmé la prise en charge du courriel.");
  }
  const recipient = parsed.data.Messages[0].To[0];
  if (recipient.Email.toLowerCase() !== email.toLowerCase()) {
    console.error("Réponse Mailjet pour un destinataire inattendu.");
    throw new Error("Le service e-mail n’a pas confirmé la prise en charge du courriel.");
  }
  console.info("Courriel accepté par Mailjet :", { messageId: recipient.MessageUUID });
  return recipient.MessageUUID;
}