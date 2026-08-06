import crypto from "crypto";
import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../middleware/asyncHandler";
import { requireAuth, requirePlatformAdminKey } from "../middleware/auth";
import { ApiError } from "../middleware/errorHandler";
import { signToken } from "../utils/jwt";
import { sendPasswordResetEmail, sendWelcomeEmail } from "../services/emailTemplates.service";

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

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
          mustChangePassword: true,
        },
      });

      return { company, admin };
    });

    await sendWelcomeEmail({
      to: admin.email,
      name: admin.name,
      companyName: company.name,
      password: body.password,
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

    const user = await prisma.user.findUnique({
      where: { email: body.email },
      include: { company: { select: { active: true } } },
    });
    if (!user) {
      throw new ApiError(401, "E-mail ou senha inválidos");
    }

    const valid = await bcrypt.compare(body.password, user.passwordHash);
    if (!valid) {
      throw new ApiError(401, "E-mail ou senha inválidos");
    }

    if (!user.company.active) {
      throw new ApiError(403, "O acesso da sua empresa está desativado. Fale com o suporte.");
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
        mustChangePassword: user.mustChangePassword,
      },
    });
  })
);

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

// Qualquer usuário logado pode trocar a própria senha (ex: senha inicial definida pelo admin)
authRouter.patch(
  "/password",
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = changePasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!user) throw new ApiError(404, "Usuário não encontrado");

    const valid = await bcrypt.compare(body.currentPassword, user.passwordHash);
    if (!valid) throw new ApiError(401, "Senha atual incorreta");

    const passwordHash = await bcrypt.hash(body.newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, mustChangePassword: false },
    });

    res.status(204).send();
  })
);

const forgotPasswordSchema = z.object({ email: z.string().email() });

// Sempre responde 204 igual, exista ou não o e-mail — não vamos vazar quais e-mails têm conta.
authRouter.post(
  "/forgot-password",
  asyncHandler(async (req, res) => {
    const body = forgotPasswordSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: body.email } });

    if (user) {
      const rawToken = crypto.randomBytes(32).toString("hex");
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetTokenHash: hashToken(rawToken),
          passwordResetExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      });
      await sendPasswordResetEmail({ to: user.email, name: user.name, token: rawToken });
    }

    res.status(204).send();
  })
);

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8),
});

authRouter.post(
  "/reset-password",
  asyncHandler(async (req, res) => {
    const body = resetPasswordSchema.parse(req.body);
    const tokenHash = hashToken(body.token);

    const user = await prisma.user.findFirst({
      where: { passwordResetTokenHash: tokenHash, passwordResetExpiresAt: { gt: new Date() } },
    });
    if (!user) throw new ApiError(400, "Link inválido ou expirado. Peça uma nova redefinição de senha.");

    const passwordHash = await bcrypt.hash(body.newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        mustChangePassword: false,
        passwordResetTokenHash: null,
        passwordResetExpiresAt: null,
      },
    });

    res.status(204).send();
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
        mustChangePassword: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new ApiError(404, "Usuário não encontrado");
    }

    res.json(user);
  })
);
