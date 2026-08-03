import { Router } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../middleware/asyncHandler";
import { requireAuth } from "../middleware/auth";

export const notificationRouter = Router();

notificationRouter.use(requireAuth);

notificationRouter.get(
  "/pending",
  asyncHandler(async (req, res) => {
    const companyId = req.user!.companyId;
    const userId = req.user!.userId;
    const role = req.user!.role;

    const in48h = new Date(Date.now() + 48 * 60 * 60 * 1000);
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const isManagerial = role === "comprador" || role === "admin" || role === "aprovador";

    const [pendingApprovals, pendingQuotes, quotesDueSoon, myPendingRequests, atrasados] = await Promise.all([
      prisma.approvalStep.count({
        where: { status: "pendente", approverId: userId, request: { companyId } },
      }),
      role === "comprador" || role === "admin"
        ? prisma.purchaseRequest.count({ where: { companyId, status: "em_cotacao" } })
        : Promise.resolve(0),
      role === "comprador" || role === "admin"
        ? prisma.purchaseRequest.findMany({
            where: { companyId, status: "em_cotacao", quoteDeadline: { not: null, lte: in48h } },
            select: { id: true, title: true, quoteDeadline: true },
            orderBy: { quoteDeadline: "asc" },
          })
        : Promise.resolve([]),
      prisma.purchaseRequest.count({
        where: { companyId, requesterId: userId, status: "aguardando_aprovacao" },
      }),
      // pedidos parados há mais de 3 dias sem avançar (aprovação ou cotação)
      isManagerial
        ? prisma.purchaseRequest.count({
            where: {
              companyId,
              status: { in: ["aguardando_aprovacao", "em_cotacao"] },
              updatedAt: { lte: threeDaysAgo },
            },
          })
        : Promise.resolve(0),
    ]);

    res.json({ pendingApprovals, pendingQuotes, quotesDueSoon, myPendingRequests, atrasados });
  })
);
