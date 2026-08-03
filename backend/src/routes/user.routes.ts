import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../middleware/asyncHandler";
import { requireAuth, requireRole } from "../middleware/auth";
import { ApiError } from "../middleware/errorHandler";
import { ROLES } from "../utils/roles";

export const userRouter = Router();

userRouter.use(requireAuth);

const userSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  companyId: true,
  departmentId: true,
  createdAt: true,
} as const;

userRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const users = await prisma.user.findMany({
      where: { companyId: req.user!.companyId },
      select: userSelect,
      orderBy: { name: "asc" },
    });
    res.json(users);
  })
);

userRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findFirst({
      where: { id: req.params.id, companyId: req.user!.companyId },
      select: userSelect,
    });
    if (!user) throw new ApiError(404, "Usuário não encontrado");
    res.json(user);
  })
);

const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  role: z.enum(ROLES),
  departmentId: z.string().uuid().optional(),
  password: z.string().min(8),
});

userRouter.post(
  "/",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const body = createUserSchema.parse(req.body);

    if (body.departmentId) {
      const department = await prisma.department.findFirst({
        where: { id: body.departmentId, companyId: req.user!.companyId },
      });
      if (!department) throw new ApiError(400, "Setor inválido para esta empresa");
    }

    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) throw new ApiError(409, "Já existe um usuário com este e-mail");

    const passwordHash = await bcrypt.hash(body.password, 10);

    const user = await prisma.user.create({
      data: {
        companyId: req.user!.companyId,
        name: body.name,
        email: body.email,
        phone: body.phone,
        role: body.role,
        departmentId: body.departmentId,
        passwordHash,
      },
      select: userSelect,
    });

    res.status(201).json(user);
  })
);

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  role: z.enum(ROLES).optional(),
  departmentId: z.string().uuid().nullable().optional(),
  password: z.string().min(8).optional(),
});

userRouter.patch(
  "/:id",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const body = updateUserSchema.parse(req.body);

    const existing = await prisma.user.findFirst({
      where: { id: req.params.id, companyId: req.user!.companyId },
    });
    if (!existing) throw new ApiError(404, "Usuário não encontrado");

    if (body.departmentId) {
      const department = await prisma.department.findFirst({
        where: { id: body.departmentId, companyId: req.user!.companyId },
      });
      if (!department) throw new ApiError(400, "Setor inválido para esta empresa");
    }

    const { password, ...rest } = body;

    const user = await prisma.user.update({
      where: { id: existing.id },
      data: {
        ...rest,
        ...(password ? { passwordHash: await bcrypt.hash(password, 10) } : {}),
      },
      select: userSelect,
    });

    res.json(user);
  })
);

userRouter.delete(
  "/:id",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const existing = await prisma.user.findFirst({
      where: { id: req.params.id, companyId: req.user!.companyId },
    });
    if (!existing) throw new ApiError(404, "Usuário não encontrado");

    await prisma.user.delete({ where: { id: existing.id } });
    res.status(204).send();
  })
);
