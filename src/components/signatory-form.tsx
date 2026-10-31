"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, LockKeyhole } from "lucide-react";

type Submission = {
  id: string;
  organizationName: string;
  organizationType: string;
  representativeName: string;
  representativeRole: string;
  email: string;
  phone: string;
  address: string;
  website: string;
  status: string;
  createdAt: string;
};

const STORAGE_KEY = "voix-enfance-demo-signatories";

export function SignatoryForm() {
  const router = useRouter();

  const [hasReadDocument, setHasReadDocument] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [supportsInitiative, setSupportsInitiative] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");

    if (!hasReadDocument || !isAuthorized || !supportsInitiative) {
      setErrorMessage(
        "Veuillez confirmer la lecture du document, votre habilitation et le soutien de votre structure.",
      );
      return;
    }

    const formData = new FormData(event.currentTarget);

    const requiredFields = [
      "organizationName",
      "representativeName",
      "representativeRole",
      "email",
    ];

    const hasMissingField = requiredFields.some(
      (field) => !String(formData.get(field) ?? "").trim(),
    );

    if (hasMissingField) {
      setErrorMessage("Veuillez compléter tous les champs obligatoires.");
      return;
    }

    setIsSubmitting(true);

    const submission: Submission = {
      id: crypto.randomUUID(),
      organizationName: String(formData.get("organizationName") ?? "").trim(),
      organizationType: String(formData.get("organizationType") ?? "Association"),
      representativeName: String(formData.get("representativeName") ?? "").trim(),
      representativeRole: String(formData.get("representativeRole") ?? "").trim(),
      email: String(formData.get("email") ?? "").trim(),
      phone: String(formData.get("phone") ?? "").trim(),
      address: String(formData.get("address") ?? "").trim(),
      website: String(formData.get("website") ?? "").trim(),
      status: "À connecter à OpenSign",
      createdAt: new Date().toISOString(),
    };

    try {
      const storedValue = localStorage.getItem(STORAGE_KEY) ?? "[]";
      const existingSubmissions = JSON.parse(storedValue) as Submission[];

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify([submission, ...existingSubmissions]),
      );

      setIsComplete(true);
    } catch {
      setErrorMessage(
        "Impossible d'enregistrer la demande dans ce navigateur. Vérifiez les paramètres de stockage puis réessayez.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isComplete) {
    return (
      <div className="success">
        <CheckCircle2 size={26} aria-hidden="true" />

        <h3>Demande enregistrée en mode démonstration</h3>

        <p>
          Les informations de votre structure ont été conservées dans ce navigateur.
          Aucune signature électronique n&apos;a encore été créée et aucun e-mail
          n&apos;a été envoyé, car OpenSign et Supabase ne sont pas configurés.
        </p>

        <p>
          <strong>Référence :</strong> demande de démonstration
        </p>

        <button
          className="btn btn-outline"
          type="button"
          onClick={() => router.push("/")}
        >
          Retour à l&apos;accueil
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-grid">
        <div className="field full">
          <label htmlFor="organizationName">
            Nom de l&apos;association ou du collectif *
          </label>

          <input
            id="organizationName"
            name="organizationName"
            type="text"
            autoComplete="organization"
            required
            placeholder="Nom de votre structure"
          />
        </div>

        <div className="field">
          <label htmlFor="organizationType">Type de structure</label>

          <select
            id="organizationType"
            name="organizationType"
            defaultValue="Association"
          >
            <option value="Association">Association</option>
            <option value="Collectif">Collectif</option>
            <option value="Organisation">Organisation</option>
            <option value="Autre">Autre</option>
          </select>
        </div>

        <div className="field">
          <label htmlFor="website">Site internet</label>

          <input
            id="website"
            name="website"
            type="url"
            placeholder="https://"
            autoComplete="url"
          />
        </div>

        <div className="field">
          <label htmlFor="representativeName">
            Nom et prénom du représentant *
          </label>

          <input
            id="representativeName"
            name="representativeName"
            type="text"
            autoComplete="name"
            required
            placeholder="Nom et prénom"
          />
        </div>

        <div className="field">
          <label htmlFor="representativeRole">Fonction *</label>

          <input
            id="representativeRole"
            name="representativeRole"
            type="text"
            required
            placeholder="Président(e), coordinateur..."
          />
        </div>

        <div className="field">
          <label htmlFor="email">Adresse e-mail *</label>

          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="contact@association.fr"
          />
        </div>

        <div className="field">
          <label htmlFor="phone">Téléphone</label>

          <input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            placeholder="+33..."
          />
        </div>

        <div className="field full">
          <label htmlFor="address">Coordonnées postales (facultatif)</label>

          <input
            id="address"
            name="address"
            type="text"
            autoComplete="street-address"
            placeholder="Adresse de la structure"
          />
        </div>
      </div>

      <div className="notice">
        Version de référence : proposition de loi interassociative fournie au projet.
        La version et son empreinte seront enregistrées côté serveur lors de
        l&apos;activation de Supabase.
      </div>

      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={hasReadDocument}
          onChange={(event) => setHasReadDocument(event.target.checked)}
        />

        <span>
          Je confirme avoir consulté et pris connaissance du PDF intégral de la
          proposition de loi. *
        </span>
      </label>

      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={isAuthorized}
          onChange={(event) => setIsAuthorized(event.target.checked)}
        />

        <span>
          Je déclare être habilité(e) à représenter la structure indiquée. *
        </span>
      </label>

      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={supportsInitiative}
          onChange={(event) => setSupportsInitiative(event.target.checked)}
        />

        <span>
          Je souhaite exprimer le soutien de cette structure à l&apos;initiative
          interassociative et accepte que son nom figure parmi les signataires
          lors de la transmission aux parlementaires. *
        </span>
      </label>

      {errorMessage ? (
        <p style={{ color: "#b42318", fontSize: 13 }} role="alert">
          {errorMessage}
        </p>
      ) : null}

      <button
        className="btn btn-primary"
        type="submit"
        disabled={
          isSubmitting ||
          !hasReadDocument ||
          !isAuthorized ||
          !supportsInitiative
        }
      >
        <LockKeyhole size={16} aria-hidden="true" />

        {isSubmitting
          ? "Enregistrement..."
          : "Enregistrer ma demande de soutien"}
      </button>

      <p className="muted" style={{ marginTop: 12 }}>
        En mode démonstration, ce formulaire n&apos;équivaut pas à une signature
        électronique.
      </p>
    </form>
  );
}