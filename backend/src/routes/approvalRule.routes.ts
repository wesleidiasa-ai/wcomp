import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../middleware/asyncHandler";
import { requireAuth, requireRole } from "../middleware/auth";
import { ApiError } from "../middleware/errorHandler";

export const approvalRuleRouter = Router();

approvalRuleRouter.use(requireAuth);

approvalRuleRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const rules = await prisma.approvalRule.findMany({
      where: { companyId: req.user!.companyId },
      orderBy: [{ departmentId: "asc" }, { stepOrder: "asc" }],
      include: { approver: { select: { id: true, name: true, email: true } } },
    });
    res.json(rules);
  })
);

const ruleSchema = z.object({
  departmentId: z.string().uuid().nullable().optional(),
  minValue: z.number().nonnegative().default(0),
  maxValue: z.number().positive().nullable().optional(),
  stepOrder: z.number().int().positive(),
  approverId: z.string().uuid(),
});

async function assertRefsBelongToCompany(
  companyId: string,
  departmentId: string | null | undefined,
  approverId: string
) {
  const approver = await prisma.user.findFirst({ where: { id: approverId, companyId } });
  if (!approver) throw new ApiError(400, "Aprovador inválido para esta empresa");
  if (approver.role !== "aprovador" && approver.role !== "admin") {
    throw new ApiError(400, "O usuário selecionado não tem papel de aprovador");
  }

  if (departmentId) {
    const department = await prisma.department.findFirst({ where: { id: departmentId, companyId } });
    if (!department) throw new ApiError(400, "Setor inválido para esta empresa");
  }
}

approvalRuleRouter.post(
  "/",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const body = ruleSchema.parse(req.body);
    await assertRefsBelongToCompany(req.user!.companyId, body.departmentId, body.approverId);

    const rule = await prisma.approvalRule.create({
      data: { ...body, companyId: req.user!.companyId },
    });
    res.status(201).json(rule);
  })
);

approvalRuleRouter.patch(
  "/:id",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const body = ruleSchema.partial().parse(req.body);

    const existing = await prisma.approvalRule.findFirst({
      where: { id: req.params.id, companyId: req.user!.companyId },
    });
    if (!existing) throw new ApiError(404, "Regra de aprovação não encontrada");

    await assertRefsBelongToCompany(
      req.user!.companyId,
      body.departmentId ?? existing.departmentId,
      body.approverId ?? existing.approverId
    );

    const rule = await prisma.approvalRule.update({ where: { id: existing.id }, data: body });
    res.json(rule);
  })
);

approvalRuleRouter.delete(
  "/:id",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const existing = await prisma.approvalRule.findFirst({
      where: { id: req.params.id, companyId: req.user!.companyId },
    });
    if (!existing) throw new ApiError(404, "Regra de aprovação não encontrada");

    await prisma.approvalRule.delete({ where: { id: existing.id } });
    res.status(204).send();
  })
);
