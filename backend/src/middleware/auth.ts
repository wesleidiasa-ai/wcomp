import { NextFunction, Request, Response } from "express";
import { verifyToken } from "../utils/jwt";
import { ApiError } from "./errorHandler";

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw new ApiError(401, "Token de autenticação ausente");
  }

  const token = header.slice("Bearer ".length);

  try {
    req.user = verifyToken(token);
    next();
  } catch {
    throw new ApiError(401, "Token de autenticação inválido ou expirado");
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new ApiError(403, "Você não tem permissão para executar esta ação");
    }
    next();
  };
}

// Protege rotas internas da plataforma (fora do escopo de empresa) com uma chave compartilhada,
// enquanto o cadastro de novas empresas é feito só por convite manual.
export function requirePlatformAdminKey(req: Request, _res: Response, next: NextFunction) {
  const key = req.headers["x-admin-key"];
  if (!process.env.PLATFORM_ADMIN_KEY || key !== process.env.PLATFORM_ADMIN_KEY) {
    throw new ApiError(401, "Chave de administrador inválida");
  }
  next();
}
