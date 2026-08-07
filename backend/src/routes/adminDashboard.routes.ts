import { Router } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../middleware/asyncHandler";
import { requirePlatformAdminKey } from "../middleware/auth";
import { emailConfigured } from "../lib/email";

export const adminDashboardRouter = Router();

adminDashboardRouter.use(requirePlatformAdminKey);

function startOfDay() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function startOfMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

const MONTH_LABELS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

adminDashboardRouter.get(
  "/summary",
  asyncHandler(async (_req, res) => {
    const today = startOfDay();
    const monthStart = startOfMonth();

    const [
      companies,
      activeCompanies,
      trialCompanies,
      payingCompanies,
      users,
      purchaseRequests,
      pedidosHoje,
      pedidosMes,
      accessRequestCount,
      feedbackCount,
      dbCheck,
    ] = await Promise.all([
      prisma.company.count(),
      prisma.company.count({ where: { active: true } }),
      prisma.company.count({ where: { plan: "trial" } }),
      prisma.company.count({ where: { plan: { not: "trial" } } }),
      prisma.user.count(),
      prisma.purchaseRequest.count(),
      prisma.purchaseRequest.count({ where: { createdAt: { gte: today } } }),
      prisma.purchaseRequest.count({ where: { createdAt: { gte: monthStart } } }),
      prisma.accessRequest.count(),
      prisma.feedback.count(),
      prisma.$queryRaw`SELECT 1`.then(
        () => true,
        () => false
      ),
    ]);

    // tempo médio de aprovação, economia gerada e valor movimentado, em toda a plataforma
    const requestsForStats = await prisma.purchaseRequest.findMany({
      select: {
        createdAt: true,
        status: true,
        estimatedTotal: true,
        department: { select: { name: true } },
        quotes: { where: { selected: true }, select: { totalPrice: true, freightValue: true } },
        statusHistory: { where: { toStatus: "aprovado" }, select: { changedAt: true }, take: 1 },
      },
    });

    const approvalDurations: number[] = [];
    let economiaGerada = 0;
    let totalMovimentado = 0;
    const sectorCounts = new Map<string, number>();

    for (const r of requestsForStats) {
      const approvedAt = r.statusHistory[0]?.changedAt;
      if (approvedAt) approvalDurations.push(approvedAt.getTime() - r.createdAt.getTime());

      const quote = r.quotes[0];
      if (quote && r.estimatedTotal) {
        economiaGerada += Math.max(0, Number(r.estimatedTotal) - Number(quote.totalPrice));
      }

      if (r.status === "recebido") {
        const total = quote
          ? Number(quote.totalPrice) + Number(quote.freightValue ?? 0)
          : Number(r.estimatedTotal ?? 0);
        totalMovimentado += total;
      }

      const sectorName = r.department?.name ?? "Sem setor";
      sectorCounts.set(sectorName, (sectorCounts.get(sectorName) ?? 0) + 1);
    }
    const tempoMedioAprovacaoDias =
      approvalDurations.length === 0
        ? null
        : approvalDurations.reduce((a, b) => a + b, 0) / approvalDurations.length / (1000 * 60 * 60 * 24);

    // ranking de setores: agrupado pelo nome do setor (texto livre por empresa,
    // não é uma categoria compartilhada — empresas diferentes podem usar nomes diferentes
    // pra algo parecido, ou o mesmo nome pra coisas diferentes)
    const sectorRanking = [...sectorCounts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // crescimento: empresas cadastradas por mês, últimos 6 meses
    const monthsBack = 6;
    const now = new Date();
    const rangeStart = new Date(now.getFullYear(), now.getMonth() - (monthsBack - 1), 1);
    const recentCompanies = await prisma.company.findMany({
      where: { createdAt: { gte: rangeStart } },
      select: { createdAt: true },
    });

    const buckets = new Map<string, number>();
    for (let i = 0; i < monthsBack; i++) {
      const d = new Date(rangeStart.getFullYear(), rangeStart.getMonth() + i, 1);
      buckets.set(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, 0);
    }
    for (const c of recentCompanies) {
      const key = `${c.createdAt.getFullYear()}-${String(c.createdAt.getMonth() + 1).padStart(2, "0")}`;
      if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
    const growth = [...buckets.entries()].map(([key, count]) => {
      const [, month] = key.split("-").map(Number);
      return { month: key, label: MONTH_LABELS[month - 1], count };
    });

    res.json({
      kpis: { companies, activeCompanies, trialCompanies, payingCompanies, users, purchaseRequests },
      secondary: { accessRequestCount, feedbackCount, trialCompanies },
      growth,
      stats: { pedidosHoje, pedidosMes, tempoMedioAprovacaoDias, economiaGerada, totalMovimentado },
      sectorRanking,
      infra: { database: dbCheck, api: true, email: emailConfigured },
    });
  })
);

adminDashboardRouter.get(
  "/audit",
  asyncHandler(async (_req, res) => {
    const entries = await prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 20 });
    res.json(entries);
  })
);

adminDashboardRouter.get(
  "/search",
  asyncHandler(async (req, res) => {
    const q = String(req.query.q ?? "").trim();
    if (q.length < 2) {
      res.json({ companies: [], users: [], purchaseRequests: [], suppliers: [] });
      return;
    }

    const [companies, users, purchaseRequests, suppliers] = await Promise.all([
      prisma.company.findMany({
        where: { name: { contains: q, mode: "insensitive" } },
        select: { id: true, name: true },
        take: 5,
      }),
      prisma.user.findMany({
        where: {
          OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }],
        },
        select: { id: true, name: true, email: true, company: { select: { name: true } } },
        take: 5,
      }),
      prisma.purchaseRequest.findMany({
        where: { title: { contains: q, mode: "insensitive" } },
        select: { id: true, title: true, requestNumber: true, company: { select: { name: true } } },
        take: 5,
      }),
      prisma.supplier.findMany({
        where: { name: { contains: q, mode: "insensitive" } },
        select: { id: true, name: true, company: { select: { name: true } } },
        take: 5,
      }),
    ]);

    res.json({ companies, users, purchaseRequests, suppliers });
  })
);
