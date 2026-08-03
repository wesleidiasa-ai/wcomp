import multer from "multer";
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES } from "../lib/storage";
import { ApiError } from "./errorHandler";

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES[file.mimetype]) {
      cb(new ApiError(400, "Tipo de arquivo não permitido. Envie PNG, JPEG, WEBP ou PDF."));
      return;
    }
    cb(null, true);
  },
});
