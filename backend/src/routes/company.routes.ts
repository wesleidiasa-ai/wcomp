import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../middleware/asyncHandler";
import { requireAuth, requireRole } from "../middleware/auth";
import { ApiError } from "../middleware/errorHandler";
import { uploadLogo } from "../middleware/upload";

export const companyRouter = Router();

companyRouter.use(requireAuth);

const companySelect = {
  id: true,
  name: true,
  cnpj: true,
  phone: true,
  email: true,
  addressStreet: true,
  addressNumber: true,
  addressComplement: true,
  addressNeighborhood: true,
  addressCity: true,
  addressState: true,
  addressZipCode: true,
  plan: true,
  whatsappPhoneNumberId: true,
  createdAt: true,
  logoMimeType: true,
} as const;

companyRouter.get(
  "/me",
  asyncHandler(async (req, res) => {
    const company = await prisma.company.findUnique({
      where: { id: req.user!.companyId },
      select: companySelect,
    });
    if (!company) throw new ApiError(404, "Empresa não encontrada");
    const { logoMimeType, ...rest } = company;
    res.json({ ...rest, hasLogo: logoMimeType !== null });
  })
);

companyRouter.get(
  "/me/logo",
  asyncHandler(async (req, res) => {
    const company = await prisma.company.findUnique({
      where: { id: req.user!.companyId },
      select: { logo: true, logoMimeType: true },
    });
    if (!company?.logo || !company.logoMimeType) throw new ApiError(404, "Empresa ainda não tem logo");

    res.setHeader("Content-Type", company.logoMimeType);
    res.send(company.logo);
  })
);

companyRouter.post(
  "/me/logo",
  requireRole("admin"),
  uploadLogo.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new ApiError(400, "Nenhum arquivo enviado");

    await prisma.company.update({
      where: { id: req.user!.companyId },
      data: { logo: req.file.buffer, logoMimeType: req.file.mimetype },
    });

    res.status(204).send();
  })
);

companyRouter.delete(
  "/me/logo",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    await prisma.company.update({
      where: { id: req.user!.companyId },
      data: { logo: null, logoMimeType: null },
    });
    res.status(204).send();
  })
);

const companySchema = z.object({
  name: z.string().min(1).optional(),
  cnpj: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  addressStreet: z.string().optional(),
  addressNumber: z.string().optional(),
  addressComplement: z.string().optional(),
  addressNeighborhood: z.string().optional(),
  addressCity: z.string().optional(),
  addressState: z.string().max(2).optional(),
  addressZipCode: z.string().optional(),
  whatsappPhoneNumberId: z.string().trim().min(1).nullable().optional(),
});

companyRouter.patch(
  "/me",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const body = companySchema.parse(req.body);
    const company = await prisma.company.update({
      where: { id: req.user!.companyId },
      data: body,
      select: companySelect,
    });
    const { logoMimeType, ...rest } = company;
    res.json({ ...rest, hasLogo: logoMimeType !== null });
  })
);
