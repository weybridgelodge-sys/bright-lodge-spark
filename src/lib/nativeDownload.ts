import { Capacitor } from "@capacitor/core";
import type jsPDF from "jspdf";

// Convert a Blob to a base64 string (without the data: prefix).
async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  // btoa handles binary strings fine
  return btoa(binary);
}

function mimeFromFilename(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  switch (ext) {
    case "pdf": return "application/pdf";
    case "csv": return "text/csv";
    case "md": return "text/markdown";
    case "txt": return "text/plain";
    case "json": return "application/json";
    case "html": return "text/html";
    default: return "application/octet-stream";
  }
}

/**
 * Save a Blob for the user. On web: triggers a normal download.
 * On Capacitor native: writes to Cache dir and opens the Share sheet.
 */
export async function saveBlob(blob: Blob, filename: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    const { Filesystem, Directory } = await import("@capacitor/filesystem");
    const { Share } = await import("@capacitor/share");
    const base64 = await blobToBase64(blob);
    const written = await Filesystem.writeFile({
      path: filename,
      data: base64,
      directory: Directory.Cache,
    });
    try {
      await Share.share({
        title: filename,
        url: written.uri,
        dialogTitle: "Save or share file",
      });
    } catch {
      // user dismissed share sheet — nothing to do
    }
    return;
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Save a jsPDF document. Mirrors `doc.save(filename)` but works on native.
 */
export async function saveJsPdf(doc: jsPDF, filename: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    const blob = doc.output("blob");
    await saveBlob(blob, filename);
    return;
  }
  doc.save(filename);
}

// Convenience for callers that already have a string body (CSV/MD/TXT/HTML).
export async function saveText(text: string, filename: string): Promise<void> {
  const blob = new Blob([text], { type: mimeFromFilename(filename) });
  await saveBlob(blob, filename);
}
