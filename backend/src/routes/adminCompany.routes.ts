import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../middleware/asyncHandler";
import { requirePlatformAdminKey } from "../middleware/auth";
import { ApiError } from "../middleware/errorHandler";
import { logAudit } from "../lib/auditLog";

export const adminCompanyRouter = Router();

adminCompanyRouter.use(requirePlatformAdminKey);

adminCompanyRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const companies = await prisma.company.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        cnpj: true,
        email: true,
        plan: true,
        active: true,
        maxUsers: true,
        createdAt: true,
        _count: { select: { users: true, purchaseRequests: true } },
      },
    });

    res.json(
      companies.map((c) => ({
        id: c.id,
        name: c.name,
        cnpj: c.cnpj,
        email: c.email,
        plan: c.plan,
        active: c.active,
        maxUsers: c.maxUsers,
        userCount: c._count.users,
        purchaseRequestCount: c._count.purchaseRequests,
        createdAt: c.createdAt,
      }))
    );
  })
);

const updateSchema = z.object({
  active: z.boolean().optional(),
  maxUsers: z.number().int().positive().nullable().optional(),
});

adminCompanyRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const body = updateSchema.parse(req.body);

    const company = await prisma.company.findUnique({ where: { id: req.params.id } });
    if (!company) throw new ApiError(404, "Empresa não encontrada");

    const updated = await prisma.company.update({
      where: { id: company.id },
      data: body,
      select: { id: true, name: true, active: true, maxUsers: true },
    });

    if (body.active !== undefined && body.active !== company.active) {
      await logAudit(body.active ? "empresa_ativada" : "empresa_desativada", company.name);
    }
    if (body.maxUsers !== undefined && body.maxUsers !== company.maxUsers) {
      await logAudit(
        "limite_usuarios_alterado",
        company.name,
        `${company.maxUsers ?? "sem limite"} → ${body.maxUsers ?? "sem limite"}`
      );
    }

    res.json(updated);
  })
);
