export const CSV_COLUMNS = [
  "id",
  "record_type",
  "check",
  "siebel_last_updated",
  "es_last_updated",
  "name",
];

function rawValue(finding, column) {
  switch (column) {
    case "id":
      return finding.id;
    case "record_type":
      return finding.recordType;
    case "check":
      return finding.check;
    case "siebel_last_updated":
      return finding.siebelLastUpdated;
    case "es_last_updated":
      return finding.esLastUpdated;
    case "name":
      return finding.name;
    default:
      return "";
  }
}

export function csvEscape(value) {
  if (value == null) {
    return "";
  }
  let text = String(value);
  const formula = /^[=+\-@\t\r]/.test(text);
  if (formula) {
    text = `'${text}`;
  }
  if (/[",\r\n]/.test(text) || formula) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function findingsToCsv(findings) {
  const rows = [CSV_COLUMNS.join(",")];
  (findings || []).forEach((finding) => {
    rows.push(CSV_COLUMNS.map((column) => csvEscape(rawValue(finding, column))).join(","));
  });
  return rows.join("\r\n");
}
