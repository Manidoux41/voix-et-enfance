import "server-only";

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
  await sendTransactionalEmail(email, "Votre code de validation – Voix & Enfance", message);
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
    const error = await response.text();

    console.error("Erreur Brevo :", response.status, error);

    throw new Error(
      `Échec de l'envoi du courriel via Brevo (${response.status}).`
    );
  }
}