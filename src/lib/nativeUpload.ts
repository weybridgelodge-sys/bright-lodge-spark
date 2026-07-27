import { Capacitor } from "@capacitor/core";

/**
 * Prepare a File selected via <input type="file"> for upload through
 * supabase-js (which uses fetch under the hood).
 *
 * Root cause this works around:
 *   Inside the Capacitor Android WebView, `fetch(url, { body: file })`
 *   where `file` is a File/Blob backed by the OS file picker frequently
 *   fails with a bare "TypeError: Failed to fetch". The WebView doesn't
 *   reliably stream a file-backed Blob body across the JS↔native bridge.
 *   Reading the bytes into memory first (ArrayBuffer → Blob) sidesteps
 *   the streaming path and uploads succeed.
 *
 * On web we return the original File unchanged (zero overhead, keeps the
 * filename metadata Supabase uses for content sniffing).
 */
export async function toUploadBody(file: File): Promise<Blob | File> {
  if (!Capacitor.isNativePlatform()) return file;
  const buf = await file.arrayBuffer();
  return new Blob([buf], { type: file.type || "application/octet-stream" });
}
