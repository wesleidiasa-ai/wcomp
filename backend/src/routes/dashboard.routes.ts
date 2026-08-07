import { Router } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../middleware/asyncHandler";
import { requireAuth, requireRole } from "../middleware/auth";

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth);

const STALLABLE_STATUSES = ["aguardando_aprovacao", "em_cotacao"];
const AWAITING_DELIVERY_STATUSES = ["pedido_enviado", "aguardando_entrega", "aguardando_retirada"];
const STALL_DAYS_THRESHOLD = 3;
const MONTH_LABELS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function startOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function scopeFor(req: { user?: { companyId: string; role: string; userId: string } }) {
  const companyId = req.user!.companyId;
  // solicitante só vê os próprios pedidos; os demais papéis veem a empresa toda
  return req.user!.role === "solicitante" ? { companyId, requesterId: req.user!.userId } : { companyId };
}

async function countAtrasados(scope: Record<string, unknown>) {
  const [stalled, awaitingDelivery] = await Promise.all([
    prisma.purchaseRequest.count({
      where: {
        ...scope,
        status: { in: STALLABLE_STATUSES },
        updatedAt: { lte: new Date(Date.now() - STALL_DAYS_THRESHOLD * 24 * 60 * 60 * 1000) },
      },
    }),
    prisma.purchaseRequest.findMany({
      where: { ...scope, status: { in: AWAITING_DELIVERY_STATUSES } },
      select: { quotes: { where: { selected: true }, select: { createdAt: true, deliveryDays: true } } },
    }),
  ]);

  const now = Date.now();
  const lateDeliveries = awaitingDelivery.filter((r) => {
    const quote = r.quotes[0];
    if (!quote?.deliveryDays) return false;
    const expected = new Date(quote.createdAt);
    expected.setDate(expected.getDate() + quote.deliveryDays);
    return now > expected.getTime();
  }).length;

  return stalled + lateDeliveries;
}

dashboardRouter.get(
  "/summary",
  asyncHandler(async (req, res) => {
    const scope = scopeFor(req);
    const monthStart = startOfMonth();
    const prevMonthStart = startOfMonth(new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, 1));

    const [pedidosEsteMes, aguardandoAprovacao, emCotacao, pedidosAtrasados, recebidosEsteMes, recebidosMesAnterior] =
      await Promise.all([
        prisma.purchaseRequest.count({ where: { ...scope, createdAt: { gte: monthStart } } }),
        prisma.purchaseRequest.count({ where: { ...scope, status: "aguardando_aprovacao" } }),
        prisma.purchaseRequest.count({ where: { ...scope, status: "em_cotacao" } }),
        countAtrasados(scope),
        prisma.purchaseRequest.findMany({
          where: { ...scope, status: "recebido", createdAt: { gte: monthStart } },
          select: {
            estimatedTotal: true,
            quotes: { where: { selected: true }, select: { totalPrice: true, freightValue: true } },
          },
        }),
        prisma.purchaseRequest.findMany({
          where: { ...scope, status: "recebido", createdAt: { gte: prevMonthStart, lt: monthStart } },
          select: {
            estimatedTotal: true,
            quotes: { where: { selected: true }, select: { totalPrice: true, freightValue: true } },
          },
        }),
      ]);

    function summarizePeriod(rows: typeof recebidosEsteMes) {
      let compras = 0;
      let economia = 0;
      for (const request of rows) {
        const quote = request.quotes[0];
        const quoteTotal = quote ? Number(quote.totalPrice) + Number(quote.freightValue ?? 0) : null;
        compras += quoteTotal ?? Number(request.estimatedTotal ?? 0);
        if (quote && request.estimatedTotal) {
          economia += Math.max(0, Number(request.estimatedTotal) - Number(quote.totalPrice));
        }
      }
      return { compras, economia, count: rows.length };
    }

    const atual = summarizePeriod(recebidosEsteMes);
    const anterior = summarizePeriod(recebidosMesAnterior);
    const estimadoComCotacaoEsteMes = recebidosEsteMes.reduce(
      (sum, r) => sum + (r.quotes[0] ? Number(r.estimatedTotal ?? 0) : 0),
      0
    );

    res.json({
      pedidosEsteMes,
      aguardandoAprovacao,
      emCotacao,
      pedidosAtrasados,
      comprasRealizadas: atual.compras,
      comprasRealizadasCount: atual.count,
      economiaObtida: atual.economia,
      economiaObtidaPercent: estimadoComCotacaoEsteMes > 0 ? (atual.economia / estimadoComCotacaoEsteMes) * 100 : null,
      previousMonth: { pedidos: anterior.count, compras: anterior.compras, economia: anterior.economia },
    });
  })
);

dashboardRouter.get(
  "/attention",
  asyncHandler(async (req, res) => {
    const scope = scopeFor(req);

    const [stallable, awaitingDelivery] = await Promise.all([
      prisma.purchaseRequest.findMany({
        where: { ...scope, status: { in: STALLABLE_STATUSES } },
        select: { id: true, requestNumber: true, title: true, status: true, updatedAt: true },
      }),
      prisma.purchaseRequest.findMany({
        where: { ...scope, status: { in: AWAITING_DELIVERY_STATUSES } },
        select: {
          id: true,
          requestNumber: true,
          title: true,
          quotes: { where: { selected: true }, select: { createdAt: true, deliveryDays: true } },
        },
      }),
    ]);

    const now = Date.now();
    const items: { id: string; requestNumber: number | null; title: string; severity: "alta" | "media"; reason: string }[] = [];

    for (const r of stallable) {
      const days = Math.floor((now - r.updatedAt.getTime()) / (24 * 60 * 60 * 1000));
      if (days < STALL_DAYS_THRESHOLD) continue;
      const label = r.status === "aguardando_aprovacao" ? "aguardando aprovação" : "cotação aguardando resposta";
      items.push({
        id: r.id,
        requestNumber: r.requestNumber,
        title: r.title,
        severity: days >= 5 ? "alta" : "media",
        reason: `${label} há ${days} dias`,
      });
    }

    for (const r of awaitingDelivery) {
      const quote = r.quotes[0];
      if (!quote?.deliveryDays) continue;
      const expected = new Date(quote.createdAt);
      expected.setDate(expected.getDate() + quote.deliveryDays);
      const diffDays = Math.floor((expected.getTime() - now) / (24 * 60 * 60 * 1000));

      if (diffDays < 0) {
        items.push({
          id: r.id,
          requestNumber: r.requestNumber,
          title: r.title,
          severity: "alta",
          reason: `fornecedor atrasado (${Math.abs(diffDays)}d)`,
        });
      } else if (diffDays <= 1) {
        items.push({
          id: r.id,
          requestNumber: r.requestNumber,
          title: r.title,
          severity: "media",
          reason: diffDays === 0 ? "prazo do fornecedor vence hoje" : "prazo do fornecedor vence amanhã",
        });
      }
    }

    items.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "alta" ? -1 : 1));
    res.json(items.slice(0, 8));
  })
);

dashboardRouter.get(
  "/monthly",
  asyncHandler(async (req, res) => {
    const scope = scopeFor(req);
    const range = (req.query.range as string | undefined) ?? "6m";

    const now = new Date();
    let monthsBack = 6;
    let rangeStart = new Date(now.getFullYear(), now.getMonth() - (monthsBack - 1), 1);
    let rangeEndExclusive = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    if (range === "12m") {
      monthsBack = 12;
      rangeStart = new Date(now.getFullYear(), now.getMonth() - (monthsBack - 1), 1);
    } else if (range === "ytd") {
      rangeStart = new Date(now.getFullYear(), 0, 1);
      monthsBack = now.getMonth() + 1;
    } else if (range === "last_year") {
      rangeStart = new Date(now.getFullYear() - 1, 0, 1);
      rangeEndExclusive = new Date(now.getFullYear(), 0, 1);
      monthsBack = 12;
    }

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
      if (!receivedAt || receivedAt < rangeStart || receivedAt >= rangeEndExclusive) continue;

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
      quotes: { where: { selected: true }, select: { totalPrice: true, supplierName: true, supplierId: true } },
      statusHistory: { select: { toStatus: true, changedAt: true }, orderBy: { changedAt: "asc" } },
    },
  });

  // gasto por setor (pedidos recebidos)
  const gastoPorSetorMap = new Map<string, { id: string | null; name: string; total: number }>();
  // top solicitantes (todos os pedidos)
  const solicitanteMap = new Map<string, { name: string; count: number }>();
  // top fornecedores (por cotação vencedora)
  const fornecedorMap = new Map<string, { supplierId: string | null; name: string; count: number; total: number; economia: number }>();
  // status dos pedidos (todos, independente de status)
  const statusMap = new Map<string, number>();

  const approvalDurations: number[] = [];
  const purchaseDurations: number[] = [];
  let economiaTotal = 0;
  let estimadoComCotacao = 0;

  for (const r of requests) {
    const deptKey = r.department?.id ?? "sem-setor";
    const deptName = r.department?.name ?? "Sem setor";
    const quote = r.quotes[0];
    const spentValue = quote ? Number(quote.totalPrice) : Number(r.estimatedTotal ?? 0);

    statusMap.set(r.status, (statusMap.get(r.status) ?? 0) + 1);

    if (r.status === "recebido") {
      const entry = gastoPorSetorMap.get(deptKey) ?? { id: r.department?.id ?? null, name: deptName, total: 0 };
      entry.total += spentValue;
      gastoPorSetorMap.set(deptKey, entry);
    }

    const reqEntry = solicitanteMap.get(r.requester.id) ?? { name: r.requester.name, count: 0 };
    reqEntry.count += 1;
    solicitanteMap.set(r.requester.id, reqEntry);

    if (quote) {
      const fEntry = fornecedorMap.get(quote.supplierName) ?? {
        supplierId: quote.supplierId,
        name: quote.supplierName,
        count: 0,
        total: 0,
        economia: 0,
      };
      fEntry.count += 1;
      fEntry.total += Number(quote.totalPrice);
      if (r.estimatedTotal) {
        const economiaFornecedor = Math.max(0, Number(r.estimatedTotal) - Number(quote.totalPrice));
        fEntry.economia += economiaFornecedor;
        economiaTotal += economiaFornecedor;
        estimadoComCotacao += Number(r.estimatedTotal);
      }
      fornecedorMap.set(quote.supplierName, fEntry);
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
  const statusBreakdown = [...statusMap.entries()].map(([status, count]) => ({ status, count }));

  return {
    gastoPorSetor,
    topSolicitantes: [...solicitanteMap.values()].sort((a, b) => b.count - a.count).slice(0, 10),
    topFornecedores,
    statusBreakdown,
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

    const insights: { icon: string; text: string; link?: string }[] = [];

    const totalGasto = data.gastoPorSetor.reduce((sum, d) => sum + d.total, 0);
    const topSetor = data.gastoPorSetor[0];
    if (topSetor && totalGasto > 0) {
      const pct = (topSetor.total / totalGasto) * 100;
      const totalFormatado = topSetor.total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
      insights.push({
        icon: "📊",
        text: `${topSetor.name} representa ${pct.toFixed(0)}% dos gastos. ${totalFormatado} movimentados no período.`,
        link: topSetor.id ? `/pedidos?departmentId=${topSetor.id}` : undefined,
      });
    }

    if (data.estimadoComCotacao > 0) {
      const pct = (data.economiaEmNegociacoes / data.estimadoComCotacao) * 100;
      const economiaFormatada = data.economiaEmNegociacoes.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
      insights.push({
        icon: "💰",
        text: `Economia de ${pct.toFixed(1)}% nas negociações. ${economiaFormatada} economizados.`,
      });
    }

    if (cotacoesParadas > 0) {
      insights.push({
        icon: "⚠️",
        text: `Existe${cotacoesParadas > 1 ? "m" : ""} ${cotacoesParadas} pedido(s) aguardando cotação há mais de 3 dias.`,
        link: "/pedidos?status=em_cotacao",
      });
    }

    const topFornecedor = data.topFornecedores[0];
    if (topFornecedor) {
      insights.push({
        icon: "🏆",
        text: `${topFornecedor.name} é seu fornecedor mais utilizado. ${topFornecedor.count} compra(s) realizadas no período.`,
        link: topFornecedor.supplierId ? `/fornecedores/${topFornecedor.supplierId}` : undefined,
      });
    }

    res.json(insights);
  })
);
