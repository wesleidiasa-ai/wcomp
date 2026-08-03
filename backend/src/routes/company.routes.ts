import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../middleware/asyncHandler";
import { requireAuth, requireRole } from "../middleware/auth";
import { ApiError } from "../middleware/errorHandler";

export const companyRouter = Router();

companyRouter.use(requireAuth);

companyRouter.get(
  "/me",
  asyncHandler(async (req, res) => {
    const company = await prisma.company.findUnique({ where: { id: req.user!.companyId } });
    if (!company) throw new ApiError(404, "Empresa não encontrada");
    res.json(company);
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
    });
    res.json(company);
  })
);
