"use client";

import { useEffect, useState } from "react";

type Item = {
  id: string;
  organizationName: string;
  organizationType: string;
  representativeName: string;
  representativeRole: string;
  email: string;
  status: string;
  createdAt: string;
};

const STORAGE_KEY = "voix-enfance-demo-signatories";

export function AdminDashboard() {
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    try {
      const storedItems = localStorage.getItem(STORAGE_KEY) || "[]";
      setItems(JSON.parse(storedItems) as Item[]);
    } catch {
      setItems([]);
    }
  }, []);

  function exportCsv() {
    const header = [
      "Structure",
      "Type",
      "Représentant",
      "Fonction",
      "Email",
      "Statut",
      "Date",
    ];

    const rows = items.map((item) => [
      item.organizationName,
      item.organizationType,
      item.representativeName,
      item.representativeRole,
      item.email,
      item.status,
      item.createdAt,
    ]);

    const csvContent = [header, ...rows]
      .map((row) =>
        row
          .map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`)
          .join(";"),
      )
      .join("\n");

    const blob = new Blob(["\ufeff", csvContent], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "registre-demo-signataires.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <div className="admin-grid">
        <div className="metric">
          <span>Demandes enregistrées</span>
          <strong>{items.length}</strong>
        </div>
        <div className="metric">
          <span>Signatures vérifiées</span>
          <strong>0</strong>
        </div>
        <div className="metric">
          <span>En attente d&apos;intégration</span>
          <strong>{items.length}</strong>
        </div>
      </div>

      <div className="panel">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            marginBottom: 16,
            flexWrap: "wrap",
          }}
        >
          <h2 style={{ margin: 0 }}>Demandes de soutien</h2>
          <button
            className="btn btn-outline"
            type="button"
            onClick={exportCsv}
            disabled={!items.length}
          >
            Exporter CSV
          </button>
        </div>

        {!items.length ? (
          <p className="muted">
            Aucune demande enregistrée dans ce navigateur. Les demandes du
            formulaire apparaîtront ici en mode démonstration.
          </p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Structure</th>
                  <th>Représentant</th>
                  <th>E-mail</th>
                  <th>Date</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.organizationName}</td>
                    <td>
                      {item.representativeName}
                      <br />
                      <span className="muted">{item.representativeRole}</span>
                    </td>
                    <td>{item.email}</td>
                    <td>
                      {new Date(item.createdAt).toLocaleDateString("fr-FR")}
                    </td>
                    <td>
                      <span className="status">{item.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
