export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/gif",
  "image/webp",
  "image/bmp",
  "image/svg+xml",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.oasis.opendocument.text",
  "application/vnd.oasis.opendocument.spreadsheet",
  "text/plain",
  "text/csv",
];

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
export const MAX_FILE_SIZE_MB = 10;

function isAllowedType(mimeType: string): boolean {
  if (ALLOWED_MIME_TYPES.includes(mimeType)) return true;
  if (mimeType.startsWith("image/")) {
    return ALLOWED_MIME_TYPES.some((t) => t.startsWith("image/") && mimeType === t);
  }
  return false;
}

export function validateUploadFile(file: File): { valid: true } | { valid: false; error: string } {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { valid: false, error: `Datei zu groß (max. ${MAX_FILE_SIZE_MB} MB).` };
  }
  if (!file.type || !isAllowedType(file.type)) {
    return { valid: false, error: "Dateityp nicht erlaubt. Erlaubt sind PDF, Bilder, Office-Dateien, ODT und Textdateien." };
  }
  return { valid: true };
}

export function uploadHint(): string {
  return `Max. ${MAX_FILE_SIZE_MB} MB. Erlaubt: PDF, Bilder, Office, ODT, TXT, CSV.`;
}
