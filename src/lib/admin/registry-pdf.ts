import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";

export type RegistryRow = {
  structure: string; type: string; representative: string; role: string; signedAt: string; version: string;
};

function wrap(text: string, font: PDFFont, width: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const character of text.replace(/\s+/gu, " ").trim()) {
    if (line && font.widthOfTextAtSize(line + character, 9) > width) {
      lines.push(line); line = "";
    }
    line += character;
  }
  lines.push(line);
  return lines;
}

export async function buildRegistryPdf(rows: RegistryRow[], source?: Uint8Array) {
  const pdf = source ? await PDFDocument.load(source) : await PDFDocument.create();
  const sourcePages = pdf.getPageCount();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const widths = [155, 85, 145, 115, 105, 165];
  const labels = ["Structure", "Type", "Représentant", "Fonction", "Signature (UTC)", "Version signée"];
  let page = pdf.addPage();
  page.setSize(842, 595);
  let y = 0;
  let number = 0;
  function header() {
    number++;
    page.drawText("REGISTRE DES SIGNATURES FINALISÉES", { x: 36, y: 555, size: 15, font: bold });
    page.drawText(`${rows.length} signature(s) - Registre privé - Page ${number}`, { x: 36, y: 535, size: 10, font });
    page.drawText("Synthèse administrative ; les preuves PDF individuelles restent conservées séparément.", { x: 36, y: 518, size: 9, font });
    let x = 36;
    labels.forEach((label, index) => {
      page.drawText(label, { x: x + 4, y: 495, size: 9, font: bold });
      x += widths[index];
    });
    y = 479;
  }
  header();
  if (!rows.length) page.drawText("Aucune signature finalisée pour ce périmètre.", { x: 36, y, size: 10, font });
  for (const row of rows) {
    const date = new Date(row.signedAt);
    if (Number.isNaN(date.getTime())) throw new Error("Date de signature invalide dans le registre.");
    const values = [row.structure, row.type, row.representative, row.role,
      date.toISOString().replace("T", " ").slice(0, 16), row.version];
    const cells = values.map((value, index) => wrap(value, font, widths[index] - 8));
    const height = Math.max(...cells.map(cell => cell.length));
    for (let line = 0; line < height; line++) {
      if (y < 48) { page = pdf.addPage(); page.setSize(842, 595); header(); }
      let x = 36;
      cells.forEach((cell, index) => {
        if (cell[line]) page.drawText(cell[line], { x: x + 4, y, size: 9, font });
        x += widths[index];
      });
      y -= 12;
    }
    page.drawLine({ start: { x: 36, y: y + 3 }, end: { x: 806, y: y + 3 }, thickness: 0.3, color: rgb(0.7, 0.7, 0.7) });
    y -= 8;
  }
  return { bytes: await pdf.save(), registryPages: pdf.getPageCount() - sourcePages };
}
