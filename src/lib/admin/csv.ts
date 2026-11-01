export function csvCell(value: unknown) {
  const text = String(value ?? "");
  const safe = /^[\s]*[=+\-@]/.test(text) || /^[\t\r\n]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
}
export function csvRow(values: unknown[]) {
  return values.map(csvCell).join(";") + "\r\n";
}
