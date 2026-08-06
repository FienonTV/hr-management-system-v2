export async function extractTextFromBuffer(buffer: Buffer, mimeType: string): Promise<string | null> {
  const MAX_TEXT_BYTES = 2 * 1024 * 1024;
  try {
    switch (mimeType) {
      case "application/pdf": {
        const pdfParse = require("pdf-parse");
        const result = await pdfParse(buffer);
        return result.text?.slice(0, MAX_TEXT_BYTES) ?? null;
      }
      case "application/msword":
      case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      case "application/vnd.oasis.opendocument.text": {
        const mammothModule = require("mammoth");
        const mammoth = mammothModule.default || mammothModule;
        const result = await mammoth.extractRawText({ buffer });
        return result.value?.slice(0, MAX_TEXT_BYTES) ?? null;
      }
      case "text/plain":
      case "text/csv": {
        return buffer.toString("utf8").slice(0, MAX_TEXT_BYTES);
      }
      default:
        return null;
    }
  } catch (error) {
    console.warn("Text extraction failed", mimeType, error);
    return null;
  }
}
