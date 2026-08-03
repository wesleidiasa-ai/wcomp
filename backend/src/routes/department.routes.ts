import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../middleware/asyncHandler";
import { requireAuth, requireRole } from "../middleware/auth";
import { ApiError } from "../middleware/errorHandler";

export const departmentRouter = Router();

departmentRouter.use(requireAuth);

departmentRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const departments = await prisma.department.findMany({
      where: { companyId: req.user!.companyId },
      orderBy: { name: "asc" },
    });
    res.json(departments);
  })
);

departmentRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const department = await prisma.department.findFirst({
      where: { id: req.params.id, companyId: req.user!.companyId },
    });
    if (!department) throw new ApiError(404, "Setor não encontrado");
    res.json(department);
  })
);

const departmentSchema = z.object({ name: z.string().min(1) });

departmentRouter.post(
  "/",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const body = departmentSchema.parse(req.body);
    const department = await prisma.department.create({
      data: { name: body.name, companyId: req.user!.companyId },
    });
    res.status(201).json(department);
  })
);

departmentRouter.patch(
  "/:id",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const body = departmentSchema.partial().parse(req.body);

    const existing = await prisma.department.findFirst({
      where: { id: req.params.id, companyId: req.user!.companyId },
    });
    if (!existing) throw new ApiError(404, "Setor não encontrado");

    const department = await prisma.department.update({
      where: { id: existing.id },
      data: body,
    });
    res.json(department);
  })
);

departmentRouter.delete(
  "/:id",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const existing = await prisma.department.findFirst({
      where: { id: req.params.id, companyId: req.user!.companyId },
    });
    if (!existing) throw new ApiError(404, "Setor não encontrado");

    await prisma.department.delete({ where: { id: existing.id } });
    res.status(204).send();
  })
);
