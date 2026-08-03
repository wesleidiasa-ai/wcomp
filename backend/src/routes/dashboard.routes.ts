import { Router } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../middleware/asyncHandler";
import { requireAuth, requireRole } from "../middleware/auth";

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth);

function startOfMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

dashboardRouter.get(
  "/summary",
  asyncHandler(async (req, res) => {
    const companyId = req.user!.companyId;
    const monthStart = startOfMonth();
    // solicitante só vê os próprios pedidos; os demais papéis veem a empresa toda
    const scope = req.user!.role === "solicitante" ? { companyId, requesterId: req.user!.userId } : { companyId };

    const [pedidosEsteMes, aguardandoAprovacao, emCotacao, recebidosEsteMes] = await Promise.all([
      prisma.purchaseRequest.count({ where: { ...scope, createdAt: { gte: monthStart } } }),
      prisma.purchaseRequest.count({ where: { ...scope, status: "aguardando_aprovacao" } }),
      prisma.purchaseRequest.count({ where: { ...scope, status: "em_cotacao" } }),
      prisma.purchaseRequest.findMany({
        where: { ...scope, status: "recebido", createdAt: { gte: monthStart } },
        select: {
          estimatedTotal: true,
          quotes: { where: { selected: true }, select: { totalPrice: true, freightValue: true } },
        },
      }),
    ]);

    let comprasRealizadas = 0;
    let economiaObtida = 0;

    for (const request of recebidosEsteMes) {
      const quote = request.quotes[0];
      const quoteTotal = quote ? Number(quote.totalPrice) + Number(quote.freightValue ?? 0) : null;
      comprasRealizadas += quoteTotal ?? Number(request.estimatedTotal ?? 0);

      if (quote && request.estimatedTotal) {
        economiaObtida += Math.max(0, Number(request.estimatedTotal) - Number(quote.totalPrice));
      }
    }

    res.json({
      pedidosEsteMes,
      aguardandoAprovacao,
      emCotacao,
      comprasRealizadas,
      comprasRealizadasCount: recebidosEsteMes.length,
      economiaObtida,
    });
  })
);

dashboardRouter.get(
  "/monthly",
  asyncHandler(async (req, res) => {
    const companyId = req.user!.companyId;
    const scope = req.user!.role === "solicitante" ? { companyId, requesterId: req.user!.userId } : { companyId };

    const now = new Date();
    const monthsBack = 6;
    const rangeStart = new Date(now.getFullYear(), now.getMonth() - (monthsBack - 1), 1);

    const requests = await prisma.purchaseRequest.findMany({
      where: { ...scope, status: "recebido" },
      select: {
        estimatedTotal: true,
        quotes: { where: { selected: true }, select: { totalPrice: true, freightValue: true } },
        statusHistory: {
          where: { toStatus: "recebido" },
          select: { changedAt: true },
          orderBy: { changedAt: "desc" },
          take: 1,
        },
      },
    });

    const buckets = new Map<string, { total: number; economia: number; count: number }>();
    for (let i = 0; i < monthsBack; i++) {
      const d = new Date(rangeStart.getFullYear(), rangeStart.getMonth() + i, 1);
      buckets.set(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, {
        total: 0,
        economia: 0,
        count: 0,
      });
    }

    for (const r of requests) {
      const receivedAt = r.statusHistory[0]?.changedAt;
      if (!receivedAt || receivedAt < rangeStart) continue;

      const key = `${receivedAt.getFullYear()}-${String(receivedAt.getMonth() + 1).padStart(2, "0")}`;
      const bucket = buckets.get(key);
      if (!bucket) continue;

      const quote = r.quotes[0];
      const total = quote ? Number(quote.totalPrice) + Number(quote.freightValue ?? 0) : Number(r.estimatedTotal ?? 0);
      bucket.total += total;
      bucket.count += 1;
      if (quote && r.estimatedTotal) {
        bucket.economia += Math.max(0, Number(r.estimatedTotal) - Number(quote.totalPrice));
      }
    }

    const MONTH_LABELS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const months = [...buckets.entries()].map(([key, value]) => {
      const [, month] = key.split("-").map(Number);
      return { month: key, label: MONTH_LABELS[month - 1], ...value };
    });

    res.json(months);
  })
);

async function computeIndicators(companyId: string) {
  const requests = await prisma.purchaseRequest.findMany({
    where: { companyId },
    select: {
      id: true,
      status: true,
      estimatedTotal: true,
      createdAt: true,
      department: { select: { id: true, name: true } },
      requester: { select: { id: true, name: true } },
      quotes: { where: { selected: true }, select: { totalPrice: true, supplierName: true } },
      statusHistory: { select: { toStatus: true, changedAt: true }, orderBy: { changedAt: "asc" } },
    },
  });

  // gasto por setor (pedidos recebidos)
  const gastoPorSetorMap = new Map<string, { name: string; total: number }>();
  // top solicitantes (todos os pedidos)
  const solicitanteMap = new Map<string, { name: string; count: number }>();
  // top fornecedores (por cotação vencedora)
  const fornecedorMap = new Map<string, { name: string; count: number; total: number }>();

  const approvalDurations: number[] = [];
  const purchaseDurations: number[] = [];
  let economiaTotal = 0;
  let estimadoComCotacao = 0;

  for (const r of requests) {
    const deptKey = r.department?.id ?? "sem-setor";
    const deptName = r.department?.name ?? "Sem setor";
    const quote = r.quotes[0];
    const spentValue = quote ? Number(quote.totalPrice) : Number(r.estimatedTotal ?? 0);

    if (r.status === "recebido") {
      const entry = gastoPorSetorMap.get(deptKey) ?? { name: deptName, total: 0 };
      entry.total += spentValue;
      gastoPorSetorMap.set(deptKey, entry);
    }

    const reqEntry = solicitanteMap.get(r.requester.id) ?? { name: r.requester.name, count: 0 };
    reqEntry.count += 1;
    solicitanteMap.set(r.requester.id, reqEntry);

    if (quote) {
      const fEntry = fornecedorMap.get(quote.supplierName) ?? { name: quote.supplierName, count: 0, total: 0 };
      fEntry.count += 1;
      fEntry.total += Number(quote.totalPrice);
      fornecedorMap.set(quote.supplierName, fEntry);

      if (r.estimatedTotal) {
        economiaTotal += Math.max(0, Number(r.estimatedTotal) - Number(quote.totalPrice));
        estimadoComCotacao += Number(r.estimatedTotal);
      }
    }

    const createdEvent = r.createdAt.getTime();
    const approvedEvent = r.statusHistory.find((h) => h.toStatus === "aprovado")?.changedAt;
    const receivedEvent = r.statusHistory.find((h) => h.toStatus === "recebido")?.changedAt;

    if (approvedEvent) {
      approvalDurations.push(approvedEvent.getTime() - createdEvent);
    }
    if (approvedEvent && receivedEvent) {
      purchaseDurations.push(receivedEvent.getTime() - approvedEvent.getTime());
    }
  }

  const avgDays = (durations: number[]) =>
    durations.length === 0 ? null : durations.reduce((a, b) => a + b, 0) / durations.length / (1000 * 60 * 60 * 24);

  const gastoPorSetor = [...gastoPorSetorMap.values()].sort((a, b) => b.total - a.total);
  const topFornecedores = [...fornecedorMap.values()].sort((a, b) => b.total - a.total).slice(0, 10);

  return {
    gastoPorSetor,
    topSolicitantes: [...solicitanteMap.values()].sort((a, b) => b.count - a.count).slice(0, 10),
    topFornecedores,
    tempoMedioAprovacaoDias: avgDays(approvalDurations),
    tempoMedioCompraDias: avgDays(purchaseDurations),
    economiaEmNegociacoes: economiaTotal,
    estimadoComCotacao,
  };
}

dashboardRouter.get(
  "/indicators",
  requireRole("admin", "comprador"),
  asyncHandler(async (req, res) => {
    const data = await computeIndicators(req.user!.companyId);
    const { estimadoComCotacao: _estimadoComCotacao, ...response } = data;
    res.json(response);
  })
);

dashboardRouter.get(
  "/insights",
  requireRole("admin", "comprador"),
  asyncHandler(async (req, res) => {
    const companyId = req.user!.companyId;
    const data = await computeIndicators(companyId);

    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const cotacoesParadas = await prisma.purchaseRequest.count({
      where: { companyId, status: "em_cotacao", updatedAt: { lte: threeDaysAgo } },
    });

    const insights: { icon: string; text: string }[] = [];

    const totalGasto = data.gastoPorSetor.reduce((sum, d) => sum + d.total, 0);
    const topSetor = data.gastoPorSetor[0];
    if (topSetor && totalGasto > 0) {
      const pct = (topSetor.total / totalGasto) * 100;
      insights.push({
        icon: "📈",
        text: `O setor ${topSetor.name} representa ${pct.toFixed(0)}% dos gastos deste período.`,
      });
    }

    if (data.estimadoComCotacao > 0) {
      const pct = (data.economiaEmNegociacoes / data.estimadoComCotacao) * 100;
      insights.push({
        icon: "💰",
        text: `A economia obtida nas negociações foi de ${pct.toFixed(1)}%.`,
      });
    }

    if (cotacoesParadas > 0) {
      insights.push({
        icon: "⚠️",
        text: `Existe${cotacoesParadas > 1 ? "m" : ""} ${cotacoesParadas} pedido(s) aguardando cotação há mais de 3 dias.`,
      });
    }

    const topFornecedor = data.topFornecedores[0];
    if (topFornecedor) {
      insights.push({
        icon: "🏆",
        text: `${topFornecedor.name} é o fornecedor mais utilizado neste período.`,
      });
    }

    res.json(insights);
  })
);
