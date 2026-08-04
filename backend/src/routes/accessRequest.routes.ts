import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../middleware/asyncHandler";
import { requirePlatformAdminKey } from "../middleware/auth";

export const accessRequestRouter = Router();

const accessRequestSchema = z.object({
  companyName: z.string().min(1),
  contactName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  message: z.string().optional(),
});

// Formulário público de "quero testar" — só registra o interesse, não cria empresa/usuário
accessRequestRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const body = accessRequestSchema.parse(req.body);
    const created = await prisma.accessRequest.create({ data: body });
    res.status(201).json({ id: created.id });
  })
);

// Lista os pedidos de acesso pra quem tem a chave de administrador da plataforma
accessRequestRouter.get(
  "/",
  requirePlatformAdminKey,
  asyncHandler(async (_req, res) => {
    const requests = await prisma.accessRequest.findMany({ orderBy: { createdAt: "desc" } });
    res.json(requests);
  })
);
