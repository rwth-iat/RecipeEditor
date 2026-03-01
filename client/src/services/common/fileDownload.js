export function downloadBlob({ filename, blob }) {
  if (!filename || !blob) {
    throw new Error("downloadBlob requires filename and blob");
  }

  const link = document.createElement("a");
  const objectUrl = window.URL.createObjectURL(blob);

  link.setAttribute("href", objectUrl);
  link.setAttribute("download", filename);
  link.dataset.downloadurl = [blob.type || "application/octet-stream", filename, objectUrl].join(":");
  link.draggable = true;
  link.classList.add("dragout");
  link.click();

  window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 0);
}

export function downloadTextFile({
  filename,
  content,
  mimeType = "text/plain;charset=utf-8",
}) {
  const blob = new Blob([content ?? ""], { type: mimeType });
  downloadBlob({ filename, blob });
}
