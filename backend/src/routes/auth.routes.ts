import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../middleware/asyncHandler";
import { requireAuth, requirePlatformAdminKey } from "../middleware/auth";
import { ApiError } from "../middleware/errorHandler";
import { signToken } from "../utils/jwt";

export const authRouter = Router();

const registerCompanySchema = z.object({
  companyName: z.string().min(1),
  cnpj: z.string().optional(),
  adminName: z.string().min(1),
  adminEmail: z.string().email(),
  adminPhone: z.string().optional(),
  password: z.string().min(8),
});

// Cria a empresa (tenant) e o primeiro usuário admin.
// Só quem tem a chave de administrador da plataforma pode chamar — cadastro é por convite manual,
// não existe auto-cadastro público enquanto não há cobrança.
authRouter.post(
  "/register-company",
  requirePlatformAdminKey,
  asyncHandler(async (req, res) => {
    const body = registerCompanySchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email: body.adminEmail } });
    if (existing) {
      throw new ApiError(409, "Já existe um usuário com este e-mail");
    }

    const passwordHash = await bcrypt.hash(body.password, 10);

    const { company, admin } = await prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: { name: body.companyName, cnpj: body.cnpj },
      });

      const admin = await tx.user.create({
        data: {
          companyId: company.id,
          name: body.adminName,
          email: body.adminEmail,
          phone: body.adminPhone,
          role: "admin",
          passwordHash,
        },
      });

      return { company, admin };
    });

    const token = signToken({
      userId: admin.id,
      companyId: company.id,
      role: admin.role,
      departmentId: admin.departmentId,
    });

    res.status(201).json({
      token,
      company,
      user: { id: admin.id, name: admin.name, email: admin.email, role: admin.role },
    });
  })
);

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const body = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user) {
      throw new ApiError(401, "E-mail ou senha inválidos");
    }

    const valid = await bcrypt.compare(body.password, user.passwordHash);
    if (!valid) {
      throw new ApiError(401, "E-mail ou senha inválidos");
    }

    const token = signToken({
      userId: user.id,
      companyId: user.companyId,
      role: user.role,
      departmentId: user.departmentId,
    });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
        departmentId: user.departmentId,
      },
    });
  })
);

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        companyId: true,
        departmentId: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new ApiError(404, "Usuário não encontrado");
    }

    res.json(user);
  })
);
