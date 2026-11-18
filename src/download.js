export function downloadTextFile(filename, contents, mimeType) {
  const blob = new Blob([contents == null ? "" : contents], {
    type: mimeType || "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
