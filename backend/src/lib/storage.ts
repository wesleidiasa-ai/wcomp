import fs from "fs";
import path from "path";

export const UPLOAD_DIR = path.join(process.cwd(), "uploads");

export function ensureUploadDir() {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export const ALLOWED_MIME_TYPES: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "application/pdf": ".pdf",
};

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
