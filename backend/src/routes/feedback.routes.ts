import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../middleware/asyncHandler";
import { requireAuth, requirePlatformAdminKey } from "../middleware/auth";

export const feedbackRouter = Router();

const feedbackSchema = z.object({
  type: z.enum(["bug", "melhoria", "duvida", "elogio"]),
  message: z.string().min(1).max(4000),
});

// Qualquer usuário logado pode mandar sugestão/problema — vai direto pro admin da plataforma,
// não pro admin da própria empresa.
feedbackRouter.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = feedbackSchema.parse(req.body);
    await prisma.feedback.create({
      data: {
        companyId: req.user!.companyId,
        userId: req.user!.userId,
        type: body.type,
        message: body.message,
      },
    });
    res.status(201).send();
  })
);

feedbackRouter.get(
  "/",
  requirePlatformAdminKey,
  asyncHandler(async (_req, res) => {
    const feedback = await prisma.feedback.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        company: { select: { name: true } },
        user: { select: { name: true, email: true } },
      },
    });
    res.json(feedback);
  })
);
